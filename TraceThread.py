# -*- coding: utf-8 -*-
import random
import re
import socket
import struct
import time
from copy import copy

from PyQt5.QtCore import *
import frida as _frida_native
from utils import FridaLogging
frida = FridaLogging.wrap_frida_module(_frida_native)
import json
import hexdump
import hashlib
import os

from utils import CmdUtil
from utils.LogUtil import sanitize_ansi_text

JAVA_PERFORM_PREFIX = re.compile(r'^\s*Java\.perform\(function\s*\(\)\s*\{', re.S)
JAVA_PERFORM_SUFFIX = re.compile(r'\}\s*\)\s*;?\s*$', re.S)
TRACE_DEBUG = os.environ.get("FRIDA_UI_DEBUG", "").lower() in ("1", "true", "yes", "on")

# Frida 17+ removed the bundled Java bridge from scripts loaded via
# session.create_script(). The CLI / frida-trace still ship the bridge, but
# the Python host must inject it into the bundle itself, otherwise the
# global `Java` stays undefined and `Java.perform(...)` throws. We do that
# by prepending the bundled java.js bridge (shipped inside frida-tools)
# and aliasing it onto globalThis.Java before any of the user scripts run.
_BRIDGE_CACHE = {"path": None, "source": None}

def _find_java_bridge_path():
    """Return the absolute path of the bundled java.js bridge that ships
    inside frida-tools, or None if frida-tools is not installed. The
    bridge is the same artifact the Frida CLI prepends to every script."""
    cached = _BRIDGE_CACHE["path"]
    if cached is not None:
        return cached
    try:
        import importlib.util
        spec = importlib.util.find_spec("frida_tools")
    except Exception:
        spec = None
    if spec is None or spec.origin is None:
        return None
    bridges_dir = os.path.join(os.path.dirname(spec.origin), "bridges")
    candidate = os.path.join(bridges_dir, "java.js")
    if os.path.isfile(candidate):
        _BRIDGE_CACHE["path"] = candidate
        return candidate
    return None

def load_java_bridge_prefix():
    """Build the script prefix that materializes the Frida 17+ Java
    bridge and aliases it to `Java`. Returns an empty string when the
    bridge cannot be located so the rest of the bundle still loads
    (legacy Frida 16 hosts do not need the bridge)."""
    if _BRIDGE_CACHE["source"] is not None:
        return _BRIDGE_CACHE["source"]
    bridge_path = _find_java_bridge_path()
    if bridge_path is None:
        return ""
    try:
        with open(bridge_path, "r", encoding="utf8") as fp:
            bridge_src = fp.read()
    except Exception:
        return ""
    # The bridge file ends with `var bridge = (function(){ ... }());` -
    # `bridge` is the runtime singleton. We expose it on globalThis as
    # both `Java` (legacy) and keep the local reference so a later
    # frida-tools-style injection can also find it.
    prefix = (
        "/* Frida 17+ Java bridge injection - sourced from "
        + os.path.basename(bridge_path)
        + " */\n"
        + bridge_src
        + "\n;globalThis.Java = bridge;\n"
    )
    _BRIDGE_CACHE["source"] = prefix
    return prefix

def wrap_java_perform_script(script_text, script_name):
    if not JAVA_PERFORM_PREFIX.match(script_text):
        return script_text
    stripped = JAVA_PERFORM_PREFIX.sub('', script_text, count=1)
    stripped = JAVA_PERFORM_SUFFIX.sub('', stripped, count=1)
    safe_name = script_name.replace('.', '_').replace('-', '_')
    return f'''(function(){{
function __run_when_java_ready_{safe_name}() {{
{stripped}
}}
// Call Java.perform() unconditionally. In a single-script bundle that
// includes multiple wrapped preset scripts, every wrapper used to wait
// for Java.available === true, and no one actually invoked Java.perform()
// to materialize the bridge. The synchronous-throw branch catches the
// case where the bridge is genuinely not yet wired.
var __retry_count = 0;
var __retry_timer = setInterval(function () {{
    __retry_count++;
    try {{
        Java.perform(__run_when_java_ready_{safe_name});
        clearInterval(__retry_timer);
    }} catch (performErr) {{
        if (__retry_count >= 20) {{
            clearInterval(__retry_timer);
            send({{"jsname": "{script_name}", "data": "[java-wait] Java.perform still threw: " + performErr}});
        }}
    }}
}}, 500);
}})();'''

md5 = lambda bs: hashlib.md5(bs).hexdigest()


def debug_print(message):
    if TRACE_DEBUG:
        print(sanitize_ansi_text(message))


# 继承QThread
class Runthread(QThread):
    #  通过类成员对象定义信号对象
    #功能日志信号
    loggerSignel=pyqtSignal(str)
    #输出日志
    outloggerSignel = pyqtSignal(str)
    #线程退出信号
    taskOverSignel=pyqtSignal()
    #获取一些附加成功就可以取的通用信息。这里暂时还不知道初始化一些啥信息比较好。先打通流程
    loadAppInfoSignel=pyqtSignal(object)
    searchAppInfoSignel=pyqtSignal(object)
    classListSignel=pyqtSignal(list)
    searchMemorySignel=pyqtSignal(str,str)
    setBreakSignel=pyqtSignal(dict)
    #附加成功的信号
    attachOverSignel = pyqtSignal(str)


    def __init__(self,hooksData,attachName,isSpawn,connType):
        super(Runthread, self).__init__()
        self.hooksData = hooksData
        self.attachName=attachName
        self.scripts=[]
        self.sessions=[]
        self.default_script=None
        self.device=None
        self.isSpawn=isSpawn
        self.DEXDump=False
        self.enable_deep_search=False
        self.customCallFuns=[]
        self.connType=connType
        self.address=""
        self.port=""
        self.attachType=""
        self.customPort=None
        self.usb_device_id=""
        self.default_api=None

    def quit(self):
        if self.scripts:
            for s in copy(self.scripts):
                try:
                    s.unload()
                    self.log("trace script unload")
                    self.scripts.remove(s)
                except Exception as ex:
                    print(ex)
        if self.sessions:
            for session in copy(self.sessions):
                try:
                    session.detach()
                except Exception as ex:
                    print(ex)
                finally:
                    try:
                        self.sessions.remove(session)
                    except ValueError:
                        pass
        self.default_script = None
        self.default_api = None
        self.taskOverSignel.emit()

    def log(self,msg):
        self.loggerSignel.emit(sanitize_ansi_text(msg))

    def outlog(self,msg):
        self.outloggerSignel.emit(sanitize_ansi_text(msg))

    def _attach(self,pname):
        if not self.device:
            return
        self.log("attach '{}'".format(pname))
        try:
            if self.isSpawn:
                pid = self.device.spawn([pname])
                FridaLogging.log_call("Device.spawn_result", result=pid)
                session = self.device.attach(pid)
                FridaLogging.wrap_session(session)
            else:
                session = self.device.attach(pname)
                FridaLogging.wrap_session(session)
            # session.enable_child_gating()
            source = load_java_bridge_prefix()
            if source:
                self.log("frida 17+ Java bridge injected from frida-tools")
        except Exception as ex:
            self.log("附加异常:"+str(ex))
            self.attachOverSignel.emit("ERROR."+str(ex))
            return

        # We previously ran a one-shot `__java_probe__` script here to
        # detect stale TCP port-forwards before loading the main agent.
        # In practice that probe races the lazy Java bridge on a freshly
        # attached process: it sees `typeof Java === 'undefined'` for the
        # full 3s budget on a healthy attach, AND keeping the probe
        # script open delays `default.js` enough that its own retry
        # window also expires with the same `java-undefined` verdict.
        # The CLI (`frida -U -n ...`) doesn't run any probe and gets Java
        # immediately, so the probe itself was the regression. We now
        # delegate Java detection to `default.js`'s built-in retry loop
        # (it polls for up to 6s) and surface a WARN only when the
        # in-script retries all fail.

        for item in self.hooksData:
            if item=="r0capture":
                curtime=time.strftime('%Y_%m_%d_%H_%M_%S', time.localtime(time.time()))
                source+=open('./js/r0capture.js', 'r',encoding="utf8").read()
                self.ssl_sessions={}
                self.pcap_file = open(f"./pcap/r0capture_{curtime}.pcap", "wb", 0)
                for writes in (
                        ("=I", 0xa1b2c3d4),  # Magic number
                        ("=H", 2),  # Major version number
                        ("=H", 4),  # Minor version number
                        ("=i", time.timezone),  # GMT to local correction
                        ("=I", 0),  # Accuracy of timestamps
                        ("=I", 65535),  # Max length of captured packets
                        ("=I", 228)):  # Data link type (LINKTYPE_IPV4)
                    self.pcap_file.write(struct.pack(writes[0], writes[1]))
            elif item=="jnitrace":
                source+=open('./js/jni_trace_new.js', 'r',encoding="utf8").read()
                source=source.replace("%moduleName%",self.hooksData[item]["class"])
                source = source.replace("%methodName%", self.hooksData[item]["method"])
                source = source.replace("%offset%", self.hooksData[item]["offset"])
            elif item=="ZenTracer":
                source += open('./js/trace.js', 'r', encoding="utf8").read()
                match_s = str(self.hooksData[item]["traceClass"]).replace('u\'', '\'')
                black_s = str(self.hooksData[item]["traceBClass"]).replace('u\'', '\'')
                match_method=str(self.hooksData[item]["traceMethod"]).replace('u\'', '\'')
                match_bmethod=str(self.hooksData[item]["traceBMethod"]).replace('u\'', '\'')
                source=source.replace('{MATCHREGEX}', match_s).replace("{BLACKREGEX}", black_s)
                source=source.replace('{MATCHREGEXMETHOD}',match_method).replace("{BLACKREGEXMETHOD}",match_bmethod)
                source = source.replace('%stack%', self.hooksData[item]["stack"])
                source = source.replace('%hookInit%', self.hooksData[item]["hookInit"])
                source = source.replace('%isMatch%', self.hooksData[item]["isMatch"])
                source = source.replace('%isMatchMethod%', self.hooksData[item]["isMatchMethod"])
            elif item=="match_sub":
                source +=open('./js/traceNative.js', 'r', encoding="utf8").read()
                source = source.replace("%moduleName%", self.hooksData[item]["class"])
                methods=self.hooksData[item]["method"].split(",")
                methods_s=str(methods).replace('u\'', '\'')
                source = source.replace('{methodName}', methods_s)
            elif item=="sslpining":
                source += wrap_java_perform_script(open('./js/DroidSSLUnpinning.js', 'r', encoding="utf8").read(), 'DroidSSLUnpinning.js')
            elif item=="hookEvent":
                source += wrap_java_perform_script(open("./js/hookEvent.js", 'r', encoding="utf8").read(), 'hookEvent.js')
            elif item=="RegisterNative":
                source += open("./js/hook_RegisterNatives.js", 'r', encoding="utf8").read()
            elif item=="ArtMethod":
                source += open("./js/hook_artmethod.js", 'r', encoding="utf8").read()
            elif item=="libArm":
                source += open("./js/hook_art.js", 'r', encoding="utf8").read()
            elif item == "javaEnc":
                source += wrap_java_perform_script(open("./js/javaEnc.js", 'r', encoding="utf8").read(), 'javaEnc.js')
            elif item=="stakler":
                source += open("./js/sktrace.js", 'r', encoding="utf8").read()
                source = source.replace("%moduleName%", self.hooksData[item]["class"])
                source = source.replace("%symbol%", self.hooksData[item]["symbol"])
                source = source.replace("%offset%", self.hooksData[item]["offset"])
            elif item=="custom":
                for item in self.hooksData["custom"]:
                    if item.get("fileName") == "r0capture.js":
                        curtime = time.strftime('%Y_%m_%d_%H_%M_%S', time.localtime(time.time()))
                        self.ssl_sessions = {}
                        self.pcap_file = open(f"./pcap/r0capture_{curtime}.pcap", "wb", 0)
                        for writes in (
                                ("=I", 0xa1b2c3d4),
                                ("=H", 2),
                                ("=H", 4),
                                ("=i", time.timezone),
                                ("=I", 0),
                                ("=I", 65535),
                                ("=I", 228)):
                            self.pcap_file.write(struct.pack(writes[0], writes[1]))
                    customJs= open("./custom/"+item["fileName"], 'r', encoding="utf8").read()
                    customJs = wrap_java_perform_script(customJs, item["fileName"])
                    customJs=customJs.replace("%customName%",item["class"])
                    customJs = customJs.replace("%customFileName%", item["fileName"])
                    #rpc.export.call_demo1= 匹配出主动调用要用的rpc函数
                    it = re.finditer(r"call_funs\.(.+?)=",customJs)
                    self.customCallFuns.clear()
                    for match in it:
                        self.customCallFuns.append(match.group(1))
                    # custom scripts in this repo are already self-contained IIFEs; append with separators
                    source += "\n;\n%s\n;\n" % customJs
            elif item=="tuoke":
                tuokeType=self.hooksData[item]["class"]
                if tuokeType=="dumpdex":
                    res = CmdUtil.dumpdexInit(self.attachName)
                    self.log(res)
                    source += open("./js/dump_dex.js", 'r', encoding="utf8").read()
                elif tuokeType=="dumpdexclass":
                    res=CmdUtil.dumpdexInit(self.attachName)
                    self.log(res)
                    source += open("./js/dump_dex_class.js", 'r', encoding="utf8").read()
                elif tuokeType=="FRIDA-DEXDump":
                    source += open("./js/FRIDA-DEXDump.js", 'r', encoding="utf8").read()
                    self.DEXDump=True
                elif tuokeType=="cookieDump":
                    source += open("./js/cookieDump.js", 'r', encoding="utf8").read()
                elif tuokeType=="fart":
                    # savepath="/data/local/tmp/fart/"+self.attachName
                    savepath="/data/data/"+self.attachName+"/fart/"
                    res = CmdUtil.fartInit(savepath)
                    self.log(res)
                    source += open("./js/frida_fart_hook.js", 'r', encoding="utf8").read()
                    source=source.replace("%savepath%",savepath)
            elif item=="patch":
                patchList = {}
                moduleName=""
                for patch in self.hooksData[item]:
                    patchList[patch["address"]]={
                        "moduleName":patch["class"],
                        "code": patch["code"],
                    }
                    moduleName=patch["class"]
                if len(patchList) > 0:
                    source += open("./js/patchCode.js", 'r', encoding="utf8").read()
                    print(json.dumps(patchList))
                    source = source.replace("{PATCHLIST}", json.dumps(patchList))
                    source = source.replace("%moduleName%",moduleName)
            elif item=="anti_debug":
                source += wrap_java_perform_script(open("./js/anti_debug.js", 'r', encoding="utf8").read(), 'anti_debug.js')
            elif item=="root_bypass":
                source += wrap_java_perform_script(open("./js/root_bypass.js", 'r', encoding="utf8").read(), 'root_bypass.js')
            elif item=="webview_debug":
                source += wrap_java_perform_script(open("./js/webview_debug.js", 'r', encoding="utf8").read(), 'webview_debug.js')
            elif item=="okhttp_logger":
                source += wrap_java_perform_script(open("./js/okhttp_logger.js", 'r', encoding="utf8").read(), 'okhttp_logger.js')
            elif item=="shared_prefs_watch":
                source += wrap_java_perform_script(open("./js/shared_prefs_watch.js", 'r', encoding="utf8").read(), 'shared_prefs_watch.js')
            elif item=="sqlite_logger":
                source += wrap_java_perform_script(open("./js/sqlite_logger.js", 'r', encoding="utf8").read(), 'sqlite_logger.js')
            elif item=="clipboard_monitor":
                source += wrap_java_perform_script(open("./js/clipboard_monitor.js", 'r', encoding="utf8").read(), 'clipboard_monitor.js')
            elif item=="intent_monitor":
                source += wrap_java_perform_script(open("./js/intent_monitor.js", 'r', encoding="utf8").read(), 'intent_monitor.js')
            elif item=="FCAnd_jnitrace":
                jsdata= open("./js/FCAnd_jnitrace.js", 'r', encoding="utf8").read()
                jsdata=jsdata.replace("%moduleName%",self.hooksData[item]["class"])
                jsdata =jsdata.replace("%methodName%", self.hooksData[item]["method"])
                jsdata = jsdata.replace("%offset%", self.hooksData[item]["offset"])
                source +=jsdata
            elif item=="antiFrida":
                jsdata = open("./js/anti_frida.js", 'r', encoding="utf8").read()
                jsdata = jsdata.replace("%antiType%", self.hooksData[item]["class"])
                jsdata = jsdata.replace("%Keyword%", self.hooksData[item]["method"])
                if self.hooksData[item]["isExitThread"]:
                    jsdata = jsdata.replace("%isExitThread%", "1")
                else:
                    jsdata = jsdata.replace("%isExitThread%", "")
                source += jsdata
        source += open("./js/default.js", 'r', encoding="utf8").read()
        source = source.replace("%spawn%", "1" if self.isSpawn else "")
        source += open("./js/Wallbreaker.js", 'r', encoding="utf8").read()
        script = session.create_script(source)
        FridaLogging.wrap_script(script)
        script.on("message", self.on_message)
        script.load()
        if self.isSpawn:
            self.device.resume(pid)
            self.log("resume pid:%s" % pid)
        self.sessions.append(session)
        self.default_script=script
        self.default_api=script.exports
        self.scripts.append(script)
        if self.DEXDump:
            if self.enable_deep_search:
                script.exports.switchmode(True)
                self.outlog("[DEXDump]: deep search mode is enable, maybe wait long time.")
            mds = []
            self.dump(pname, script.exports, mds=mds)
        self.attachOverSignel.emit(pname)
        try:
            # The Java bridge is lazily materialized inside the JS agent -
            # the very first call to loadappinfo() may return with
            # javaPending=true before Java.perform() has had a chance to
            # wire the bridge. Retry for a few seconds so the app-info
            # tab reflects real class/dex data on first attach.
            info = None
            for retryIndex in range(20):
                try:
                    info = script.exports.loadappinfo()
                except Exception as innerEx:
                    self.log("loadAppInfo rpc failed (attempt %d): %s" % (retryIndex + 1, innerEx))
                    info = None
                    break
                if isinstance(info, dict) and info.get("javaPending"):
                    # Give the JS-side main() a chance to materialize the
                    # bridge via Java.perform() before hammering the RPC
                    # again. The earlier default of 200ms let the V8 event
                    # loop race with the RPC handler so the bridge never
                    # wired up on busier bundles.
                    time.sleep(0.5)
                    continue
                break
            if info is not None:
                self.loadAppInfoSignel.emit(info)
        except Exception as ex:
            self.log("loadAppInfo rpc failed: " + str(ex))


    def log_pcap(self,pcap_file, ssl_session_id, function, src_addr, src_port,
                 dst_addr, dst_port, data):
        """Writes the captured data to a pcap file.
        Args:
          pcap_file: The opened pcap file.
          ssl_session_id: The SSL session ID for the communication.
          function: The function that was intercepted ("SSL_read" or "SSL_write").
          src_addr: The source address of the logged packet.
          src_port: The source port of the logged packet.
          dst_addr: The destination address of the logged packet.
          dst_port: The destination port of the logged packet.
          data: The decrypted packet data.
        """
        t = time.time()

        if ssl_session_id not in self.ssl_sessions:
            self.ssl_sessions[ssl_session_id] = (random.randint(0, 0xFFFFFFFF),
                                            random.randint(0, 0xFFFFFFFF))
        client_sent, server_sent = self.ssl_sessions[ssl_session_id]

        if function == "SSL_read":
            seq, ack = (server_sent, client_sent)
        else:
            seq, ack = (client_sent, server_sent)

        for writes in (
                # PCAP record (packet) header
                ("=I", int(t)),  # Timestamp seconds
                ("=I", int((t * 1000000) % 1000000)),  # Timestamp microseconds
                ("=I", 40 + len(data)),  # Number of octets saved
                ("=i", 40 + len(data)),  # Actual length of packet
                # IPv4 header
                (">B", 0x45),  # Version and Header Length
                (">B", 0),  # Type of Service
                (">H", 40 + len(data)),  # Total Length
                (">H", 0),  # Identification
                (">H", 0x4000),  # Flags and Fragment Offset
                (">B", 0xFF),  # Time to Live
                (">B", 6),  # Protocol
                (">H", 0),  # Header Checksum
                (">I", src_addr),  # Source Address
                (">I", dst_addr),  # Destination Address
                # TCP header
                (">H", src_port),  # Source Port
                (">H", dst_port),  # Destination Port
                (">I", seq),  # Sequence Number
                (">I", ack),  # Acknowledgment Number
                (">H", 0x5018),  # Header Length and Flags
                (">H", 0xFFFF),  # Window Size
                (">H", 0),  # Checksum
                (">H", 0)):  # Urgent Pointer
            pcap_file.write(struct.pack(writes[0], writes[1]))
        pcap_file.write(data)

        if function == "SSL_read":
            server_sent += len(data)
        else:
            client_sent += len(data)
        self.ssl_sessions[ssl_session_id] = (client_sent, server_sent)

    def r0capture_message(self,p,data):
        if data==None or len(data) == 1:
            self.outlog(p["function"])
            if len(p["stack"])>0:
                self.outlog(p["stack"])
            return

        src_addr = socket.inet_ntop(socket.AF_INET,
                                    struct.pack(">I", p["src_addr"]))
        dst_addr = socket.inet_ntop(socket.AF_INET,
                                    struct.pack(">I", p["dst_addr"]))
        self.outlog("SSL Session: " + p["ssl_session_id"])
        self.outlog("[%s] %s:%d --> %s:%d" % (
            p["function"],
            src_addr,
            p["src_port"],
            dst_addr,
            p["dst_port"]))

        self.outlog(p["stack"])
        res= hexdump.hexdump(data,"return")
        self.outlog("\n"+res)

        self.log_pcap(self.pcap_file, p["ssl_session_id"], p["function"], p["src_addr"],
                 p["src_port"], p["dst_addr"], p["dst_port"], data)


    def default_message(self,p):
        if "appinfo" in p:
            self.loadAppInfoSignel.emit(p["appinfo"])
        elif "appinfo_search" in p:
            self.searchAppInfoSignel.emit(p["appinfo_search"])
        elif "class_list" in p:
            self.classListSignel.emit(p["class_list"])
        elif "scanInfoList" in p:
            self.searchMemorySignel.emit("searchMem", sanitize_ansi_text(p["scanInfoList"]))
        elif "scanlog" in p:
            self.searchMemorySignel.emit("outlog", sanitize_ansi_text(p["scanlog"]))
        elif "breakout" in p:
            self.setBreakSignel.emit(p["breakout"])
        self.outlog(str(p["data"]))


    def sktrace_message(self,p):
        if "data" in p:
            self.outlog(p["data"])
            return
        optype=p["type"]
        if optype=="inst":
            # print(p)
            inst=json.loads(p["val"])
            address=int(p["address"],16)
            oplist=[]
            for opdata in inst["operands"]:
                if opdata["type"]=="reg":
                    if opdata["value"] not in oplist:
                        oplist.append(opdata["value"])
                elif opdata["type"]=="mem":
                    memdata=opdata["value"]
                    if memdata["base"] not in oplist:
                        oplist.append(memdata["base"])
            enddata = ""
            for item in oplist:
                enddata+="%s={%s} "%(item,item)
            outdata="tid:%s address:%s %s %s\t\t//%s"%(str(p["tid"]),str(hex(address)),inst["mnemonic"],inst["opStr"],enddata)
            self.outlog(outdata)
        elif optype=="ctx":
            context=json.loads(p["val"])
            address=int(p["address"],16)
            self.outlog("tid:" +str(p["tid"])+" address:"+str(hex(address))+" context:"+ p["val"])
        else:
            self.outlog(json.dumps(p))

    def fcand_jnitrace_message(self,p):
        data=p["data"]
        try:
            dataJson=eval(data)
            msg=json.dumps(dataJson,indent=2)
            self.outlog(msg)
        except:
            self.outlog(data)

    def other_message(self,p):
        self.outlog(str(p["data"]))

    # def showMethods(self,postdata):
    #     postdata["func"]="showMethod"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post showMethods:"+postdata["className"]+","+postdata["methodName"])
    # 
    # def showExport(self,moduleName,methodName):
    #     self.default_script.showexport(moduleName,methodName)
    #     self.log("post showExport:"+postdata["moduleName"]+","+postdata["methodName"])
    # 
    # def dumpPtr(self,postdata):
    #     postdata["func"] = "dumpPtr"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post dumpPtr:" + postdata["moduleName"] + "," + str(hex(postdata["address"])))
    # 
    # def dumpSoPtr(self,postdata):
    #     postdata["func"] = "dumpSoPtr"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post dumpSoPtr:" + postdata["moduleName"])
    # 
    # def searchInfo(self,postdata):
    #     postdata["func"] = "searchInfo"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post searchInfo")
    # 
    # def newScanProtect(self,postdata):
    #     postdata["func"] = "newScanProtect"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post newScanProtect")
    # 
    # def newScanByAddress(self,postdata):
    #     postdata["func"] = "newScanByAddress"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post newScanByAddress")
    # 
    # def getInfo(self,postdata):
    #     postdata["func"] = "getInfo"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post getInfo")
    # 
    # def setBreak(self,postdata):
    #     postdata["func"] = "setBreak"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post setBreak")
    # 
    # def nextScan(self,postdata):
    #     postdata["func"] = "nextScan"
    #     self.default_script.post({'type': 'input', 'payload': postdata})
    #     self.log("post nextScan")

    def newScanProtect(self,postdata):
        postdata["func"] = "newScanProtect"
        self.default_script.post({'type': 'input', 'payload': postdata})
        self.log("post newScanProtect")

    def newScanByAddress(self,postdata):
        postdata["func"] = "newScanByAddress"
        self.default_script.post({'type': 'input', 'payload': postdata})
        self.log("post newScanByAddress")

    def fart(self,fartType,classes):
        # postdata["func"] = "fart"
        # self.default_script.post({'type': 'input', 'payload': postdata})
        # self.log("post fart")
        api=self.default_script.exports
        if fartType==1:                 #使用frida的fart处理部分类
            api.fartclass(classes)
        elif fartType==2:               #使用frida的fart
            api.fart()
        elif fartType==3:               #使用rom的fart处理部分类
            api.romfartclass(classes)
        elif fartType==4:               #使用rom的fart完整处理
            api.romfart()

    def dumpdex(self):
        api = self.default_script.exports
        api.dumpdex()

    def on_message(self,message, data):
        if message["type"] == "error":
            debug_print("[DEBUG] on_message ERROR: %s" % json.dumps(message)[:300])
            self.outlog(json.dumps(message))
            return
        payload = message.get("payload", {})
        if isinstance(payload, dict):
            debug_print("[DEBUG] on_message: keys=%s" % list(payload.keys()))
        else:
            debug_print("[DEBUG] on_message: payload type=%s, val=%s" % (type(payload), str(payload)[:200]))
        if "init" in payload:
            self.outlog(payload["init"])
            self.log(payload["init"])
            return
        if "jsname" not in payload:
            debug_print("[DEBUG] on_message: no jsname, payload=%s" % str(payload)[:200])
            return

        if "class_list" in payload:
            debug_print("[DEBUG] on_message: class_list found, count=%d" % len(payload["class_list"]))

        if payload["jsname"]=="default":
            self.default_message(payload)
            return
        elif message["payload"]["jsname"]=="r0capture":
            self.r0capture_message(message["payload"],data)
        elif message["payload"]["jsname"]=="sktrace":
            self.sktrace_message(message["payload"])
        elif message["payload"]["jsname"] == "FCAnd_Jnitrace":
            self.fcand_jnitrace_message(message["payload"])
        else:
            self.other_message(message["payload"])

    def _on_child_added(self,child):
        print("_on_child_added")
        for item in self.hooksData:
            self._attach(child.pid,item)
        self._attach(child.pid, "default")

    def run(self):
        if self.connType=="usb":
            # self.device.on("child-added", self._on_child_added)
            custom_port = (self.customPort or "").strip()
            if len(custom_port)>0:
                str_host = "%s:%s" % ("127.0.0.1", custom_port)
                manager = frida.get_device_manager()
                FridaLogging.wrap_device_manager(manager)
                self.device = manager.add_remote_device(str_host)
            else:
                if self.usb_device_id:
                    manager = frida.get_device_manager()
                    FridaLogging.wrap_device_manager(manager)
                    try:
                        self.device = manager.get_device(self.usb_device_id, timeout=5)
                    except Exception:
                        self.device = frida.get_usb_device()
                else:
                    self.device = frida.get_usb_device()
        elif self.connType=="wifi":
            str_host = "%s:%s"%(self.address,self.port)
            manager = frida.get_device_manager()
            FridaLogging.wrap_device_manager(manager)
            self.device = manager.add_remote_device(str_host)

        if self.device is not None:
            FridaLogging.wrap_device(self.device)

        if self.attachType=="attachCurrent":
            try:
                application = self.device.get_frontmost_application()
            except Exception as err:
                self.log("附加异常,application is None err:%s"%err)
                self.attachOverSignel.emit("ERROR.无法获取到进程列表")
                return
            if application == None:
                self.log("附加异常,application is None")
                self.attachOverSignel.emit("ERROR.无法获取到进程列表")
                return

            # Prefer the package name (application.identifier) as the attach target.
            # application.name on Android frequently returns the user-visible app
            # label (e.g. "Fiddler") instead of the actual process name, which
            # can resolve to a non-Java process and make Java.available stay
            # false. The package name always identifies the right ART process.
            packageName = application.identifier or ""
            labelName = application.name or ""
            target = 'Gadget' if packageName == 're.frida.Gadget' else packageName
            if len(self.attachName) <= 0:
                resolved = False
                try:
                    procs = self.device.enumerate_processes()
                except Exception as procsErr:
                    self.log("enumerate_processes failed: %s" % procsErr)
                    procs = []
                # Pass 1: exact match against the package name (preferred).
                if target:
                    for process in procs:
                        if process.name == target:
                            self.attachName = process.name
                            resolved = True
                            break
                # Pass 2: exact match against the user-visible label, only as
                # a fallback for stripped / weirdly-named apps.
                if not resolved and labelName and labelName != target:
                    for process in procs:
                        if process.name == labelName:
                            self.log("attach hint: matched by app label '%s' (pid=%s); prefer package name '%s'." % (
                                labelName, process.pid, packageName))
                            self.attachName = process.name
                            resolved = True
                            break
                # Pass 3: case-insensitive substring match against either name.
                if not resolved and (target or labelName):
                    for process in procs:
                        pname = (process.name or "").lower()
                        if (target and target.lower() in pname) or (
                                labelName and labelName.lower() in pname):
                            self.log("attach hint: fuzzy match on '%s' (pid=%s), package '%s'." % (
                                process.name, process.pid, packageName))
                            self.attachName = process.name
                            resolved = True
                            break
                if not resolved:
                    self.log("attach WARNING: frida-server process list contains neither '%s' nor '%s'. Possible stale port-forward or wrong device. package='%s'." % (
                        target, labelName, packageName))
                    # Fall back to the package name anyway so frida-server
                    # can surface its own error message (typically a stale
                    # port-forward that resolves to a non-Java process).
                    self.attachName = target or labelName

        self._attach(self.attachName)
        print("thread over")
        # self.taskOverSignel.emit()


    #DEXDump相关的
    def dex_fix(self,dex_bytes):
        import struct
        dex_size = len(dex_bytes)

        if dex_bytes[:4] != b"dex\n":
            dex_bytes = b"dex\n035\x00" + dex_bytes[8:]

        if dex_size >= 0x24:
            dex_bytes = dex_bytes[:0x20] + struct.Struct("<I").pack(dex_size) + dex_bytes[0x24:]

        if dex_size >= 0x28:
            dex_bytes = dex_bytes[:0x24] + struct.Struct("<I").pack(0x70) + dex_bytes[0x28:]

        if dex_size >= 0x2C and dex_bytes[0x28:0x2C] not in [b'\x78\x56\x34\x12', b'\x12\x34\x56\x78']:
            dex_bytes = dex_bytes[:0x28] + b'\x78\x56\x34\x12' + dex_bytes[0x2C:]

        return dex_bytes

    def dump(self,pkg_name, api, mds=None):
        """
        """
        if mds is None:
            mds = []
        matches = api.scandex()
        for info in matches:
            try:
                bs = api.memorydump(info['addr'], info['size'])
                md = md5(bs)
                if md in mds:
                    self.outlog("[DEXDump]: Skip duplicate dex {}<{}>".format(info['addr'], md))
                    continue
                mds.append(md)
                savePath="./FRIDA_DEXDump/" + pkg_name + "/"
                if not os.path.exists(savePath):
                    os.makedirs(savePath)
                bs = self.dex_fix(bs)
                with open(savePath + info['addr'] + ".dex", 'wb') as out:
                    out.write(bs)
                self.outlog("[DEXDump]: DexSize={}, DexMd5={}, SavePath={}/{}.dex"
                            .format(hex(info['size']), md, savePath, info['addr']))
            except Exception as e:
                self.outlog("[Except] - {}: {}".format(e, info))

import os
import subprocess

cmdhead="adb shell su -c "       #切换使用adb shell su -c 和 adb shell su 0
deviceSerial = ""  # currently selected device serial (empty = default/auto)

def _adb_prefix():
    """Return the adb prefix with optional -s <serial> flag."""
    if deviceSerial:
        return f"adb -s {deviceSerial}"
    return "adb"

def getConnectedDevices():
    """Return a list of (serial, state) tuples for all connected devices."""
    result = exec("adb devices")
    devices = []
    for line in result.splitlines():
        line = line.strip()
        if line and not line.startswith("List of devices"):
            parts = line.split("\t")
            if len(parts) == 2:
                devices.append((parts[0].strip(), parts[1].strip()))
    return devices

def getDeviceArch(serial):
    """Return the CPU ABI string for the given device serial (e.g. 'arm64-v8a')."""
    try:
        cmd = f"adb -s {serial} shell getprop ro.product.cpu.abi"
        result = exec(cmd).strip()
        if result:
            if "unauthorized" in result:
                return "unauthorized"
            else:
                return result
        else:
            return "unknown"
    except Exception:
        return "unknown"

def exec(cmd):
    proc = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.PIPE  # 重定向输入值
    )
    proc.stdin.close()  # 既然没有命令行窗口，那就关闭输入
    result = proc.stdout.read()  # 读取cmd执行的输出结果（是byte类型，需要decode）
    proc.stdout.close()
    return result.decode(encoding="utf-8")

def execCmd(cmd):
    # Replace leading "adb " with the device-aware prefix
    if cmd.startswith("adb "):
        cmd = _adb_prefix() + cmd[3:]
    text = exec(cmd)
    if len(text)>0:
        text+="\ncmd命令执行"+cmd
    else:
        text ="cmd命令执行" + cmd
    return text

def execCmdData(cmd):
    if cmd.startswith("adb "):
        cmd = _adb_prefix() + cmd[3:]
    text = exec(cmd)
    return text

def dumpdexInit(packageName):
    path = "/data/data/" + packageName + "/files/" + "/dump_dex_" + packageName
    res=""
    res += adbshellCmd("mkdir -p " + path)+"\n"
    res += adbshellCmd("chmod 0777 " + "/data/data/" + packageName + "/files/")+"\n"
    res += adbshellCmd("chmod 0777 " + path)+"\n"
    return res

def fartInit(savepath):
    res=""
    res += adbshellCmd("mkdir -p " + savepath)+"\n"
    res += adbshellCmd("chmod 0777 " + savepath)+"\n"
    return res

def adbshellCmd(cmd):
    # Rebuild cmdhead with device serial for each call
    prefix = _adb_prefix()
    # cmdhead is like "adb shell su -c " – replace the "adb" part
    head = cmdhead.replace("adb ", prefix + " ", 1)
    full_cmd = "%s '%s'" % (head, cmd)
    text = exec(full_cmd)
    if len(text) > 0:
        text += "\ncmd命令执行" + full_cmd
    else:
        text = "cmd命令执行" + full_cmd
    return text

def adbshellCmdEnd(cmd, end):
    prefix = _adb_prefix()
    head = cmdhead.replace("adb ", prefix + " ", 1)
    full_cmd = "%s '%s' %s" % (head, cmd, end)
    text = exec(full_cmd)
    if len(text) > 0:
        text += "\ncmd命令执行" + full_cmd
    else:
        text = "cmd命令执行" + full_cmd
    return text

def fix_so(arch, origin_so_name, so_name, base, size):
    adb = _adb_prefix()
    if arch == "arm":
        os.system(f"{adb} push exec/android/SoFixer32 /data/local/tmp/SoFixer")
    elif arch == "arm64":
        os.system(f"{adb} push exec/android/SoFixer64 /data/local/tmp/SoFixer")
    os.system(f"{adb} shell chmod +x /data/local/tmp/SoFixer")
    os.system(f"{adb} push {so_name} /data/local/tmp/{so_name}")
    print(f"{adb} shell /data/local/tmp/SoFixer -m {base} -s /data/local/tmp/{so_name} -o /data/local/tmp/{so_name}.fix.so")
    os.system(f"{adb} shell /data/local/tmp/SoFixer -m {base} -s /data/local/tmp/{so_name} -o /data/local/tmp/{so_name}.fix.so")
    os.system(f"{adb} pull /data/local/tmp/{so_name}.fix.so {origin_so_name}_{base}_{size}_fix.so")
    os.system(f"{adb} shell rm /data/local/tmp/{so_name}")
    os.system(f"{adb} shell rm /data/local/tmp/{so_name}.fix.so")
    os.system(f"{adb} shell rm /data/local/tmp/SoFixer")
    return origin_so_name + "_" + base + "_" + str(size) + "_fix.so"
import logging
import logging.handlers
import os
import subprocess


_COMMAND_LOGGER = logging.getLogger("fridaUiTools.commands")
_COMMAND_LOGGER.setLevel(logging.INFO)
_COMMAND_LOGGER.propagate = False
_COMMAND_LOG_PATH = os.path.join("logs", "commands.log")


def _ensure_handlers():
    if _COMMAND_LOGGER.handlers:
        return
    os.makedirs(os.path.dirname(_COMMAND_LOG_PATH), exist_ok=True)
    file_handler = logging.handlers.TimedRotatingFileHandler(
        _COMMAND_LOG_PATH,
        when="D",
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    _COMMAND_LOGGER.addHandler(file_handler)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    _COMMAND_LOGGER.addHandler(console_handler)


def _format_command(cmd):
    if isinstance(cmd, (list, tuple)):
        try:
            return " ".join(str(part) for part in cmd)
        except Exception:
            return str(cmd)
    return str(cmd)


def log_command(cmd, label="exec"):
    """Public entry point used by CmdUtil and other modules to record a
    command that is about to be executed by subprocess/os.system. The same
    line is written to logs/commands.log and the console, so we have one
    audit trail regardless of which module launched the command.
    """
    _ensure_handlers()
    text = _format_command(cmd)
    if not text:
        return
    _COMMAND_LOGGER.info("%s: %s", label, text)


def get_command_logger():
    """Return the shared logger so other modules (Frida API wrappers,
    upload workers, etc.) can reuse the same file/console pipeline.
    """
    _ensure_handlers()
    return _COMMAND_LOGGER


def ensure_command_logger_ready():
    """Idempotently attach file/console handlers. Returns nothing."""
    _ensure_handlers()


def _log_command(cmd):
    log_command(cmd, label="exec")


def exec(cmd):
    log_command(cmd, label="exec")
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
    return result.decode(encoding="utf-8", errors="ignore")

def execCmd(cmd):
    text = exec(cmd)
    if len(text)>0:
        text+="\ncmd命令执行"+cmd
    else:
        text ="cmd命令执行" + cmd
    return text

def execCmdData(cmd):
    text = exec(cmd)
    return text


def _run_command(command_args):
    log_command(command_args, label="exec")
    proc = subprocess.Popen(
        command_args,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
    )
    output, _ = proc.communicate()
    return output or "", proc.returncode


def _append_command_trace(text, command_text):
    if len(text) > 0:
        return text + "\ncmd命令执行" + command_text
    return "cmd命令执行" + command_text


def _adb_shell_attempts(cmd):
    return [
        (["adb", "shell", "su", "-c", cmd], 'adb shell su -c "%s"' % cmd),
        (["adb", "shell", "su", "0", "sh", "-c", cmd], 'adb shell su 0 sh -c "%s"' % cmd),
        (["adb", "shell", "sh", "-c", cmd], 'adb shell sh -c "%s"' % cmd),
    ]


def _should_try_next(output, return_code, is_last):
    if is_last or return_code == 0:
        return False
    lower_output = (output or "").lower()
    return (
        "su: inaccessible or not found" in lower_output
        or "su: not found" in lower_output
        or "invalid uid/gid" in lower_output
        or "permission denied" in lower_output
        or return_code != 0
    )

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
    attempts = _adb_shell_attempts(cmd)
    last_output = ""
    last_command = ""
    for index, (command_args, command_text) in enumerate(attempts):
        output, return_code = _run_command(command_args)
        last_output = output
        last_command = command_text
        if _should_try_next(output, return_code, index == len(attempts) - 1):
            continue
        return _append_command_trace(output, command_text)
    return _append_command_trace(last_output, last_command)

def adbshellCmdEnd(cmd,end):
    result = adbshellCmd(cmd)
    if end:
        result += "\n" + end
    return result

def fix_so(arch, origin_so_name, so_name, base, size):
    def _run(cmd):
        log_command(cmd, label="exec")
        return os.system(cmd)

    if arch == "arm":
        _run("adb push exec/android/SoFixer32 /data/local/tmp/SoFixer")
    elif arch == "arm64":
        _run("adb push exec/android/SoFixer64 /data/local/tmp/SoFixer")
    _run("adb shell chmod +x /data/local/tmp/SoFixer")
    _run("adb push " + so_name + " /data/local/tmp/" + so_name)
    fix_cmd = "adb shell /data/local/tmp/SoFixer -m " + base + " -s /data/local/tmp/" + so_name + " -o /data/local/tmp/" + so_name + ".fix.so"
    print(fix_cmd)
    _run(fix_cmd)
    _run("adb pull /data/local/tmp/" + so_name + ".fix.so " + origin_so_name + "_" + base + "_" + str(size) + "_fix.so")
    _run("adb shell rm /data/local/tmp/" + so_name)
    _run("adb shell rm /data/local/tmp/" + so_name + ".fix.so")
    _run("adb shell rm /data/local/tmp/SoFixer")
    return origin_so_name + "_" + base + "_" + str(size) + "_fix.so"
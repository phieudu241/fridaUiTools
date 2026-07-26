"""Logging wrappers around the Frida Python API.

The audit trail lives in the same file/console stream as CmdUtil
(`logs/commands.log` plus stdout, via the `fridaUiTools.commands`
logger) but each line is prefixed with `api:` instead of `exec:`
so adb commands and Frida calls can be told apart in the log.
"""
import logging
import types

from utils import CmdUtil


_LOG_PREFIX = "api"


def _log(message):
    logger = CmdUtil.get_command_logger()
    if not isinstance(logger, logging.Logger):
        return
    text = (message or "").strip()
    if not text:
        return
    logger.info("%s: %s", _LOG_PREFIX, text)


def _format_args(args, kwargs):
    parts = []
    if args:
        parts.extend(str(a) for a in args)
    if kwargs:
        for key, value in kwargs.items():
            parts.append("%s=%s" % (key, value))
    return ", ".join(parts)


def _summarize(value):
    if value is None:
        return "None"
    if isinstance(value, (str, int, float, bool)):
        return repr(value)
    if isinstance(value, (list, tuple)):
        return "[%d items]" % len(value)
    if isinstance(value, dict):
        return "{%d keys}" % len(value)
    if isinstance(value, bytes):
        return "bytes(%d)" % len(value)
    return type(value).__name__


def _truncate(text, limit=200):
    if not text:
        return text
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def log_call(name, args=None, kwargs=None, result=None, error=None):
    header = "frida.%s(%s)" % (name, _format_args(args, kwargs))
    if error is not None:
        header += " -> error: %s" % _truncate(str(error))
    elif result is not None:
        header += " -> %s" % _summarize(result)
    _log(header)


def log_event(name, detail=""):
    message = "frida.%s" % name
    if detail:
        message += " " + detail
    _log(message)


class _FridaProxy:
    """Attribute-level proxy around the native `frida` module.

    Calls to the Frida factories listed in `_LOG_ATTRS` are intercepted and
    logged; everything else (constants such as `frida.__version__`, classes
    like `frida.Script`, less-common helpers, etc.) is transparently forwarded
    to the underlying module so existing call sites keep working unchanged.
    """

    _LOG_ATTRS = {
        "get_usb_device",
        "get_local_device",
        "get_device_manager",
        "enumerate_devices",
        "get_device",
        "get_remote_device",
    }

    def __init__(self, target):
        # Bypass our own __setattr__/__getattr__ during construction.
        object.__setattr__(self, "_frida_target", target)

    def __getattr__(self, name):
        # __getattr__ is only called when normal lookup fails, so this branch
        # never shadows attributes set on the instance itself.
        target = object.__getattribute__(self, "_frida_target")
        original = getattr(target, name)
        if name not in self._LOG_ATTRS or not callable(original):
            return original

        def _callable(*args, **kwargs):
            try:
                result = original(*args, **kwargs)
                log_call(name, args, kwargs, result=result)
                return result
            except Exception as ex:
                log_call(name, args, kwargs, error=ex)
                raise

        return _callable

    def __repr__(self):
        target = object.__getattribute__(self, "_frida_target")
        return "<FridaProxy for %r>" % (target,)


def wrap_frida_module(frida_module):
    """Return a `_FridaProxy` around the native `frida` module. The most
    common factory calls are intercepted and logged; everything else is
    forwarded transparently.
    """
    return _FridaProxy(frida_module)


def _safe_setattr(target, name, value):
    """Assign an attribute to a Frida object when possible.

    Frida classes are sometimes backed by `__slots__` for performance, so
    assigning a function via plain `setattr` can raise. We try the simple
    instance assignment first, then bind through `types.MethodType`. If both
    fail (typically because `__slots__` reserves the attribute name), we
    log a `wrap_failed` event so the missing audit point is visible and the
    original Frida implementation remains untouched.
    """
    try:
        setattr(target, name, value)
        return
    except (AttributeError, TypeError):
        pass
    try:
        bound = types.MethodType(value, target)
        setattr(target, name, bound)
        return
    except (AttributeError, TypeError):
        pass
    log_event("wrap_failed", "%s.%s" % (type(target).__name__, name))


def _wrap_target(target, prefix, names):
    for name in names:
        original = getattr(target, name, None)
        if original is None or not callable(original):
            continue

        def _callable(*args, __original=original, __name=name, **kwargs):
            try:
                result = __original(*args, **kwargs)
                log_call("%s.%s" % (prefix, __name), args, kwargs, result=result)
                return result
            except Exception as ex:
                log_call("%s.%s" % (prefix, __name), args, kwargs, error=ex)
                raise

        _safe_setattr(target, name, _callable)


def wrap_device(device):
    """Attach logging to the methods we care about on a Frida device."""
    _wrap_target(device, "Device", (
        "attach",
        "spawn",
        "resume",
        "kill",
        "enumerate_processes",
        "get_frontmost_application",
    ))


def wrap_session(session):
    """Attach logging to lifecycle methods on a Frida session."""
    _wrap_target(session, "Session", (
        # "create_script",
        "detach",
        "enable_child_gating",
        "disable_child_gating",
    ))


def wrap_script(script):
    """Attach logging to lifecycle methods on a Frida script."""
    _wrap_target(script, "Script", (
        "load",
        "unload",
        "post",
    ))


def wrap_device_manager(manager):
    """Logging wrappers for `DeviceManager.get_device`/`add_remote_device`."""
    _wrap_target(manager, "DeviceManager", (
        "get_device",
        "add_remote_device",
        "remove_remote_device",
        "enumerate_devices",
    ))
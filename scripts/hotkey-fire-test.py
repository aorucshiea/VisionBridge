# -*- coding: utf-8 -*-
"""Fire Alt+T via SendInput while the probe listens. One command, one run."""
import ctypes, os, subprocess, time
from ctypes import wintypes

ROOT = r'C:\Users\zcxzx\VisionBridge'
LOG = r'C:\Users\zcxzx\AppData\Local\Temp\hotkey-probe.log'

env = dict(os.environ)
env.pop('ELECTRON_RUN_AS_NODE', None)
logf = open(LOG, 'w', encoding='utf-8')
probe = subprocess.Popen([os.path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
                          os.path.join(ROOT, 'scripts', 'hotkey-probe.js')],
                         env=env, stdout=logf, stderr=subprocess.STDOUT)
time.sleep(5)

user32 = ctypes.windll.user32
INPUT_KEYBOARD = 1
KEYEVENTF_KEYUP = 2
KEYEVENTF_SCANCODE = 8


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [('wVk', wintypes.WORD), ('wScan', wintypes.WORD),
                ('dwFlags', wintypes.DWORD), ('time', wintypes.DWORD),
                ('dwExtraInfo', ctypes.c_void_p)]


class INPUT(ctypes.Structure):
    class _U(ctypes.Union):
        _fields_ = [('ki', KEYBDINPUT)]
    _anonymous_ = ('_U',)
    _fields_ = [('type', wintypes.DWORD), ('_U', _U)]


def key(sc, up=False):
    i = INPUT()
    i.type = INPUT_KEYBOARD
    i.ki.wScan = sc
    i.ki.dwFlags = KEYEVENTF_SCANCODE | (KEYEVENTF_KEYUP if up else 0)
    user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INPUT))


def combo(*scs, hold=0.08):
    for sc in scs:
        key(sc)
    time.sleep(hold)
    for sc in reversed(scs):
        key(sc, up=True)


SC_ALT, SC_T = 0x38, 0x14
combo(SC_ALT, SC_T)
time.sleep(1)
combo(SC_ALT, SC_T)
time.sleep(3)

logf.flush()
logf.close()
data = open(LOG, encoding='utf-8', errors='replace').read()
print('rc =', probe.poll())
print(data[-500:])
probe.kill()

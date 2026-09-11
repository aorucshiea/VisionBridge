# -*- coding: utf-8 -*-
"""End-to-end test for Alt+T text selection. Run: python test-e2e.py"""
import ctypes, json, os, subprocess, sys, time
from ctypes import wintypes

ROOT = r'C:\Users\zcxzx\VisionBridge'
EXE = os.path.join(ROOT, 'dist', 'win-unpacked', 'Vision Bridge.exe')
LOG = r'C:\Users\zcxzx\AppData\Local\Temp\vb-log.txt'
TXT = r'C:\Users\zcxzx\AppData\Local\Temp\vb-e2e.txt'
SETTINGS = r'C:\Users\zcxzx\AppData\Roaming\vision-bridge\settings.json'

# 0. ensure the flag is on and no stale instance is running
d = json.load(open(SETTINGS, encoding='utf-8'))
d['enableTextSelection'] = True
json.dump(d, open(SETTINGS, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
subprocess.run(['taskkill', '/IM', 'Vision Bridge.exe', '/F'], capture_output=True)
subprocess.run(['taskkill', '/IM', 'notepad.exe', '/F'], capture_output=True)
time.sleep(1)

open(TXT, 'w', encoding='utf-8').write('The retrieval latency budget grew from 240 ms to 610 ms.')

# 1. launch the app with renderer logging
env = dict(os.environ)
env['ELECTRON_ENABLE_LOGGING'] = '1'
# The dev shell presets this globally — it turns any Electron binary into a
# plain Node process that exits instantly with no output.
env.pop('ELECTRON_RUN_AS_NODE', None)
logf = open(LOG, 'w', encoding='utf-8')
app = subprocess.Popen([EXE,
                        '--disable-gpu', '--disable-gpu-compositing',
                        '--disable-gpu-watchdog', '--no-sandbox'],
                       cwd=os.path.dirname(EXE), env=env,
                       stdout=logf, stderr=subprocess.STDOUT)
print('[test] app pid', app.pid)
time.sleep(6)
rc = app.poll()
print('[test] app alive after 6s:', rc is None)
if rc is not None:
    print('[test] app exited early! log:')
    logf.close()
    print(open(LOG, encoding='utf-8', errors='replace').read()[-1500:])
    sys.exit(1)

# 2. notepad with the test text, focused
subprocess.Popen(['notepad.exe', TXT])
time.sleep(3)

# 3. SendInput: Ctrl+A, then Alt+T
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


def key(vk=None, sc=None, up=False):
    i = INPUT()
    i.type = INPUT_KEYBOARD
    if sc is not None:
        i.ki.wScan = sc
        i.ki.dwFlags = KEYEVENTF_SCANCODE | (KEYEVENTF_KEYUP if up else 0)
    else:
        i.ki.wVk = vk
        i.ki.dwFlags = KEYEVENTF_KEYUP if up else 0
    user32.SendInput(1, ctypes.byref(i), ctypes.sizeof(INPUT))


def combo_sc(*scs, hold=0.08):
    for sc in scs:
        key(sc=sc)
    time.sleep(hold)
    for sc in reversed(scs):
        key(sc=sc, up=True)


# hardware scancodes: Ctrl=0x1D, A=0x1E, Alt=0x38, T=0x14
SC_CTRL, SC_A, SC_ALT, SC_T = 0x1D, 0x1E, 0x38, 0x14
combo_sc(SC_CTRL, SC_A)
time.sleep(0.6)
print('[test] sending Alt+T (scancodes)')
combo_sc(SC_ALT, SC_T)
time.sleep(8)

# 4. report
logf.flush()
logf.close()
data = open(LOG, encoding='utf-8', errors='replace').read()
hits = [l for l in data.splitlines()
        if 'TextSelection' in l or 'App is available' in l or 'ready' in l.lower()]
print('[test] --- relevant log lines ---')
print('\n'.join(hits[-12:]) if hits else '(no TextSelection lines)')
print('[test] --- log tail ---')
print(data[-600:])

subprocess.run(['taskkill', '/IM', 'notepad.exe', '/F'], capture_output=True)
subprocess.run(['taskkill', '/PID', str(app.pid), '/F'], capture_output=True)
print('[test] cleaned up')

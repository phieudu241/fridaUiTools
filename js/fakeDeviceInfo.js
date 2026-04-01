'use strict';

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ===== VALUE POOLS =====
const profiles = {
    android_id: [
        "a1b2c3d4e5f67890",
        "deadbeefcafebabe",
        "1234567890abcdef",
        "f1e2d3c4b5a69788",
        "9988776655443322"
    ],
    model: ["Pixel 8", "SM-G991B", "Mi 13", "OnePlus 11", "Vivo X90"],
    manufacturer: ["Google", "Samsung", "Xiaomi", "OnePlus", "Vivo"],
    brand: ["google", "samsung", "xiaomi", "oneplus", "vivo"],
    device: ["husky", "o1s", "nuwa", "OP11", "vivoX90"],
    board: ["gs201", "exynos2100", "kona", "lahaina", "mt6983"],
    hardware: ["tensor", "exynos", "qcom", "qcom", "mtk"],
    fingerprint: [
        "google/husky/husky:14/UP1A/123456:user/release-keys",
        "samsung/o1s/o1s:13/TP1A/654321:user/release-keys",
        "xiaomi/nuwa/nuwa:14/UP1A/888888:user/release-keys",
        "oneplus/OP11/OP11:13/TP1A/777777:user/release-keys",
        "vivo/vivoX90/vivoX90:13/TP1A/999999:user/release-keys"
    ],
    display: ["UP1A.231005.007", "TP1A.220624.014", "SP1A.210812.016", "QP1A.190711.020", "RP1A.200720.012"],
    bootloader: ["unknown", "BL1", "BL2", "BL3", "BL4"],
    user: ["user", "release", "test", "prod", "debug"],
    os_version: ["10", "11", "12", "13", "14"]
};

// =======================
// PRE-SELECTED RANDOM VALUES (chosen once at startup)
// =======================
const idx = Math.floor(Math.random() * profiles.model.length);
const selected = {
    android_id:   randomChoice(profiles.android_id),
    model:        profiles.model[idx],
    manufacturer: profiles.manufacturer[idx],
    brand:        profiles.brand[idx],
    device:       profiles.device[idx],
    board:        profiles.board[idx],
    hardware:     profiles.hardware[idx],
    fingerprint:  profiles.fingerprint[idx],
    display:      profiles.display[idx],
    bootloader:   profiles.bootloader[idx],
    user:         profiles.user[idx],
    os_version:   profiles.os_version[idx]
};
console.log("[*] Selected profile:", JSON.stringify(selected));

// =======================
// SHARED HELPERS & PROP MAP (declared before all hooks)
// =======================
const propMap = {
    "ro.build.version.release": "os_version",
    "ro.build.id":              "display",
    "ro.build.display.id":      "display",
    "ro.product.model":         "model",
    "ro.product.manufacturer":  "manufacturer",
    "ro.product.brand":         "brand",
    "ro.product.device":        "device",
    "ro.product.board":         "board",
    "ro.hardware":              "hardware",
    "ro.build.fingerprint":     "fingerprint",
    "ro.bootloader":            "bootloader",
//  "ro.build.user":            "user"
};

function getFakeForKeyJS(key) {
    const poolName = propMap[key];
    if (!poolName) return null;
    return selected[poolName] || null;
}

const PROP_VALUE_MAX = 91;

function writePropValue(buf, value) {
    if (buf.isNull() || value == null) return 0;
    const s = String(value);
    const clamped = s.length >= PROP_VALUE_MAX ? s.slice(0, PROP_VALUE_MAX - 1) : s;
    buf.writeUtf8String(clamped);
    return clamped.length;
}

function findExport(moduleName, symbol) {
    try {
        return moduleName
            ? Process.getModuleByName(moduleName).getExportByName(symbol)
            : Module.getExportByName(null, symbol);
    } catch (e) {
        return null;
    }
}

// =======================
// 1. JAVA HOOKS (FIXED VALUE)
// =======================
Java.perform(function () {

    const Build   = Java.use("android.os.Build");
    const VERSION = Java.use("android.os.Build$VERSION");

    // Direct .value assignment is the ONLY reliable way to spoof
    // static final String fields in Frida. Object.defineProperty on
    // the JS wrapper does NOT affect what Java code reads back.
    function assignField(clazz, field, fake) {
        try {
            const original = clazz[field].value;
            clazz[field].value = fake;
            console.log(`[JAVA] ${field}: "${original}" -> "${fake}"`);
        } catch (e) {
            console.log(`[JAVA] WARN could not set ${field}: ${e.message}`);
        }
    }

    assignField(Build, "MODEL",        selected.model);
    assignField(Build, "MANUFACTURER", selected.manufacturer);
    assignField(Build, "BRAND",        selected.brand);
    assignField(Build, "DEVICE",       selected.device);
    assignField(Build, "BOARD",        selected.board);
    assignField(Build, "HARDWARE",     selected.hardware);
    assignField(Build, "FINGERPRINT",  selected.fingerprint);
    assignField(Build, "DISPLAY",      selected.display);
    assignField(Build, "BOOTLOADER",   selected.bootloader);
    // assignField(Build, "USER",      selected.user);
    assignField(VERSION, "RELEASE",    selected.os_version);

    // Also hook Build.getString() reflection path used by some apps
    try {
        const SystemProperties = Java.use("android.os.SystemProperties");

        // Map ro.* keys -> fake values directly in Java so SystemProperties.get()
        // returns fakes even before native hooks fire (covers the self-test too)
        SystemProperties.get.overload('java.lang.String').implementation = function (key) {
            const fake = getFakeForKeyJS(key);
            if (fake !== null) {
                return fake;
            }
            return this.get(key);
        };

        SystemProperties.get.overload('java.lang.String', 'java.lang.String').implementation = function (key, def) {
            const fake = getFakeForKeyJS(key);
            if (fake !== null) {
                return fake;
            }
            return this.get(key, def);
        };

        console.log("[JAVA] SystemProperties.get hooked");
    } catch (e) {
        console.log("[JAVA] WARN SystemProperties hook failed: " + e.message);
    }

    // ANDROID_ID
    const Secure = Java.use("android.provider.Settings$Secure");
    Secure.getString.overload(
        'android.content.ContentResolver',
        'java.lang.String'
    ).implementation = function (resolver, name) {
        const original = this.getString(resolver, name);
        if (name === "android_id") {
            const fake = selected.android_id;
            console.log(`[JAVA] android_id: "${original}" -> "${fake}"`);
            return fake;
        }
        return original;
    };

    // =======================
    // 3. SELF-TEST (runs inside same Java.perform, after all assignments)
    // =======================
    Java.scheduleOnMainThread(function () {
        console.log("\n========== SELF-TEST ==========");

        // --- Java layer: read back the fields we just assigned ---
        const BuildT   = Java.use("android.os.Build");
        const VERSIONT = Java.use("android.os.Build$VERSION");

        const javaChecks = [
            ["MODEL",           BuildT.MODEL.value,        selected.model],
            ["MANUFACTURER",    BuildT.MANUFACTURER.value, selected.manufacturer],
            ["BRAND",           BuildT.BRAND.value,        selected.brand],
            ["DEVICE",          BuildT.DEVICE.value,       selected.device],
            ["BOARD",           BuildT.BOARD.value,        selected.board],
            ["HARDWARE",        BuildT.HARDWARE.value,     selected.hardware],
            ["FINGERPRINT",     BuildT.FINGERPRINT.value,  selected.fingerprint],
            ["DISPLAY",         BuildT.DISPLAY.value,      selected.display],
            ["BOOTLOADER",      BuildT.BOOTLOADER.value,   selected.bootloader],
            ["VERSION.RELEASE", VERSIONT.RELEASE.value,    selected.os_version],
        ];

        javaChecks.forEach(function ([field, actual, expect]) {
            const ok = actual === expect;
            console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} ${field}: got="${actual}" want="${expect}"`);
        });

        // --- android_id ---
        try {
            const ctx = Java.use("android.app.ActivityThread")
                            .currentApplication()
                            .getApplicationContext();
            const SecureT = Java.use("android.provider.Settings$Secure");
            const aid = SecureT.getString(ctx.getContentResolver(), "android_id");
            const ok  = aid === selected.android_id;
            console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} android_id: got="${aid}" want="${selected.android_id}"`);
        } catch (e) {
            console.log("[JAVA] SKIP android_id: " + e.message);
        }

        // --- SystemProperties (covers both Java hook + native hook path) ---
        try {
            const SP = Java.use("android.os.SystemProperties");
            const nativeChecks = [
                ["ro.product.model",         selected.model],
                ["ro.product.manufacturer",  selected.manufacturer],
                ["ro.product.brand",         selected.brand],
                ["ro.product.device",        selected.device],
                ["ro.build.version.release", selected.os_version],
                ["ro.build.fingerprint",     selected.fingerprint],
            ];
            nativeChecks.forEach(function ([key, expect]) {
                const actual = SP.get(key);
                const ok = actual === expect;
                console.log(`[NATIVE] ${ok ? "PASS" : "FAIL"} ${key}: got="${actual}" want="${expect}"`);
            });
        } catch (e) {
            console.log("[NATIVE] SKIP SystemProperties: " + e.message);
        }

        console.log("========== END TEST ==========\n");
    });
});

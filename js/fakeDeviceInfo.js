'use strict';

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ===== VALUE POOLS =====
// Each array has 20 entries; all arrays share the same index so that
// model/manufacturer/brand/device/board/hardware/fingerprint/display/bootloader
// are always internally consistent for the selected device.
const profiles = {
    android_id: [
        // 100 realistic 16-char hex android_id values
        "a1b2c3d4e5f67890",
        "deadbeefcafebabe",
        "1234567890abcdef",
        "f1e2d3c4b5a69788",
        "9988776655443322",
        "c3d4e5f6a7b8c9d0",
        "b4a3f2e1d0c9b8a7",
        "78ef1234ab5678cd",
        "0f1e2d3c4b5a6978",
        "0f14b5ae2d3c6978",
        "11223a9876667210",
        "fedcba9876543210",
        "a0b1c2d3e4f56789",
        "9876fedc5432ba10",
        "0023344156612577",
        "eef2233af0011abb",
        "13579bdf02468ace",
        "abcdef0123456789",
        "5a6b7c8d9e0f1a2b",
        "f0e1d2c3b4a59687",
        "3c4d5e6f7a8b9c0d",
        "7f8e9d0c1b2a3f4e",
        "d1e2f3a4b5c67890",
        "e4f5a6b7c8d90123",
        "2b3c4d5e6f7a8b9c",
        "8a9b0c1d2e3f4a5b",
        "f6e5d4c3b2a19087",
        "1a2b3c4d5e6f7089",
        "c9d8e7f6a5b43210",
        "4e5f6a7b8c9d0e1f",
        "b7c8d9e0f1a23456",
        "06172839a4b5c6d7",
        "9c0d1e2f3a4b5c6d",
        "e3f4a5b6c7d8e9f0",
        "5d6e7f8a9b0c1d2e",
        "a8b9c0d1e2f3a4b5",
        "31425364758697a8",
        "bc0de1f2a3b4c5d6",
        "7e8f9a0b1c2d3e4f",
        "d5e6f7a8b9c0d1e2",
        "2f3a4b5c6d7e8f90",
        "98a7b6c5d4e3f201",
        "0e1f2a3b4c5d6e7f",
        "c4d5e6f7a8b9c0d1",
        "6b7c8d9e0f1a2b3c",
        "f2a3b4c5d6e7f809",
        "47586978a0b1c2d3",
        "da0bc1d2e3f4a5b6",
        "8c9daebfc0d1e2f3",
        "1e2f3a4b5c6d7e8f",
        "b0c1d2e3f4a5b6c7",
        "73849506a7b8c9da",
        "ef0fa1b2c3d4e5f6",
        "59607182a3b4c5d6",
        "c6d7e8f9a0b1c2d3",
        "2d3e4f5a6b7c8d9e",
        "a9b0c1d2e3f4a5b6",
        "3f405162738495a6",
        "bc7de8f9a0b1c2d3",
        "6789abcdef012345",
        "f4a5b6c7d8e9f0a1",
        "1b2c3d4e5f6a7b8c",
        "d7e8f9a0b1c2d3e4",
        "4a5b6c7d8e9f0a1b",
        "90a1b2c3d4e5f607",
        "e6f7a8b9c0d1e2f3",
        "5c6d7e8f9a0b1c2d",
        "ab0bc1d2e3f4a5b6",
        "3748596a7b8c9d0e",
        "f9a0b1c2d3e4f5a6",
        "2e3f4a5b6c7d8e9f",
        "c8d9e0f1a2b3c4d5",
        "7a8b9c0d1e2f3a4b",
        "0d1e2f3a4b5c6d7e",
        "b3c4d5e6f7a8b9c0",
        "68798a0b1c2d3e4f",
        "fda0b1c2e3f4a5b6",
        "1c2d3e4f5a6b7c8d",
        "d4e5f6a7b8c9d0e1",
        "5e6f7a8b9c0d1e2f",
        "a0b1c2d3e4f5a607",
        "3849506172839405",
        "ef1fa2b3c4d5e6f7",
        "9b0ac1d2e3f4a5b6",
        "26374859a6b7c8d9",
        "c5d6e7f8a9b0c1d2",
        "7b8c9d0e1f2a3b4c",
        "f0a1b2c3d4e5f6a7",
        "1d2e3f4a5b6c7d8e",
        "d9e0f1a2b3c4d5e6",
        "4b5c6d7e8f9a0b1c",
        "92a3b4c5d6e7f809",
        "e8f9a0b1c2d3e4f5",
        "5f6a7b8c9d0e1f2a",
        "ad0be1cf2a3b4c5d",
        "3a4b5c6d7e8f9a0b",
        "c1d2e3f4a5b6c7d8",
        "7c8d9e0f1a2b3c4d",
        "02132435465778a9",
        "b8c9d0e1f2a3b4c5"
    ],
    model: [
        "Pixel 8",
        "SM-G991B",        // Galaxy S21
        "Mi 13",
        "OnePlus 11",
        "Vivo X90",
        "Pixel 7 Pro",
        "SM-S908B",        // Galaxy S22 Ultra
        "2201123G",        // Xiaomi 12
        "CPH2449",         // OnePlus 10 Pro
        "V2145",           // Vivo Y33s
        "SM-A546B",        // Galaxy A54
        "23049PCD8G",      // Xiaomi 13 Pro
        "Pixel 6a",
        "RMX3760",         // Realme 11 Pro
        "CPH2581",         // OnePlus Nord CE 3
        "SM-F946B",        // Galaxy Z Fold5
        "23127PN0CG",      // Xiaomi 14
        "Pixel 8 Pro",
        "LE2123",          // OnePlus 9 Pro
        "SM-G990B"         // Galaxy S21 FE
    ],
    manufacturer: [
        "Google",
        "Samsung",
        "Xiaomi",
        "OnePlus",
        "Vivo",
        "Google",
        "Samsung",
        "Xiaomi",
        "OnePlus",
        "Vivo",
        "Samsung",
        "Xiaomi",
        "Google",
        "Realme",
        "OnePlus",
        "Samsung",
        "Xiaomi",
        "Google",
        "OnePlus",
        "Samsung"
    ],
    brand: [
        "google",
        "samsung",
        "xiaomi",
        "oneplus",
        "vivo",
        "google",
        "samsung",
        "xiaomi",
        "oneplus",
        "vivo",
        "samsung",
        "xiaomi",
        "google",
        "realme",
        "oneplus",
        "samsung",
        "xiaomi",
        "google",
        "oneplus",
        "samsung"
    ],
    device: [
        "husky",
        "o1s",
        "nuwa",
        "OP11",
        "vivoX90",
        "cheetah",
        "b0s",
        "zeus",
        "OP10Pro",
        "V2145",
        "a54x",
        "fuxi",
        "bluejay",
        "RMX3760",
        "ovaltine",
        "q5q",
        "houji",
        "shiba",
        "lemonadep",
        "r8q"
    ],
    board: [
        "gs201",
        "exynos2100",
        "kona",
        "lahaina",
        "mt6983",
        "gs101",
        "exynos2200",
        "taro",
        "lahaina",
        "mt6781",
        "exynos1380",
        "taro",
        "gs101",
        "mt6877",
        "sm7450",
        "armani",
        "samsungstarlte",
        "gs201",
        "lahaina",
        "exynos2100"
    ],
    hardware: [
        "tensor",
        "exynos",
        "qcom",
        "qcom",
        "mtk",
        "tensor",
        "exynos",
        "qcom",
        "qcom",
        "mtk",
        "exynos",
        "qcom",
        "tensor",
        "mtk",
        "qcom",
        "qcom",
        "qcom",
        "tensor",
        "qcom",
        "exynos"
    ],
    fingerprint: [
        "google/husky/husky:14/UP1A.231005.007/10754064:user/release-keys",
        "samsung/o1sxxx/o1s:13/TP1A.220624.014/G991BXXU5CWLA:user/release-keys",
        "xiaomi/nuwa/nuwa:13/TKQ1.221114.001/V14.0.6.0.TMACNXM:user/release-keys",
        "OnePlus/OP11/OP11:13/SKQ1.221119.001/T.13f6a92_f7bf:user/release-keys",
        "vivo/V2185A/V2185A:13/TP1A.220624.014/compiler09101556:user/release-keys",
        "google/cheetah/cheetah:14/UP1A.231005.007/10754064:user/release-keys",
        "samsung/b0sxx/b0s:13/TP1A.220624.014/S908BXXU4CWLB:user/release-keys",
        "xiaomi/zeus/zeus:12/SKQ1.211006.001/V13.0.2.0.SKACNXM:user/release-keys",
        "OnePlus/OnePlus10Pro/OP10Pro:13/SKQ1.221119.001/T.13f6a92:user/release-keys",
        "vivo/V2145/V2145:11/RP1A.200720.012/compiler09072355:user/release-keys",
        "samsung/a54xxx/a54x:13/TP1A.220624.014/A546BXXS4CWJ5:user/release-keys",
        "xiaomi/fuxi/fuxi:13/TKQ1.221114.001/V14.0.4.0.TMACNXM:user/release-keys",
        "google/bluejay/bluejay:14/AP1A.240405.002/11480754:user/release-keys",
        "realme/RMX3760/RMX3760:13/TP1A.220624.014/S.202308012255:user/release-keys",
        "OnePlus/ovaltine/ovaltine:13/SKQ1.221119.001/T.1234abcd:user/release-keys",
        "samsung/q5qxx/q5q:13/TP1A.220624.014/F946BXXU1AWI3:user/release-keys",
        "xiaomi/houji/houji:14/UKQ1.230804.001/V816.0.3.0.UNACNXM:user/release-keys",
        "google/shiba/shiba:14/UP1A.231005.007/10754064:user/release-keys",
        "OnePlus/lemonadep/lemonadep:12/SKQ1.210216.001/R.202205031254:user/release-keys",
        "samsung/r8qxx/r8q:13/TP1A.220624.014/G990BXXU5CWLA:user/release-keys"
    ],
    display: [
        "UP1A.231005.007",
        "TP1A.220624.014",
        "TKQ1.221114.001",
        "SKQ1.221119.001",
        "TP1A.220624.014",
        "UP1A.231005.007",
        "TP1A.220624.014",
        "SKQ1.211006.001",
        "SKQ1.221119.001",
        "RP1A.200720.012",
        "TP1A.220624.014",
        "TKQ1.221114.001",
        "AP1A.240405.002",
        "TP1A.220624.014",
        "SKQ1.221119.001",
        "TP1A.220624.014",
        "UKQ1.230804.001",
        "UP1A.231005.007",
        "SKQ1.210216.001",
        "TP1A.220624.014"
    ],
    bootloader: [
        "unknown",
        "BL1",
        "BL2",
        "BL3",
        "BL4",
        "unknown",
        "BL5",
        "BL1",
        "BL2",
        "BL3",
        "BL4",
        "BL1",
        "unknown",
        "BL2",
        "BL3",
        "BL5",
        "BL1",
        "unknown",
        "BL2",
        "BL4"
    ],
    user: [
        "user", "release", "test", "prod", "debug",
        "user", "release", "user", "release", "user",
        "release", "user", "user", "release", "user",
        "release", "user", "user", "release", "user"
    ],
    os_version: [
        "10", "11", "12", "13", "14",
        "14", "13", "12", "13", "11",
        "13", "13", "14", "13", "13",
        "13", "14", "14", "12", "13"
    ]
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

// =======================
// JAVA HOOKS (FIXED VALUE)
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
    assignField(Build, "PRODUCT",      selected.model);
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
                const original = this.get(key);
//                console.log(`[JAVA] SystemProperties.get("${key}"): "${original}" -> "${fake}"`);
                return fake;
            }

            return this.get(key);
        };

        SystemProperties.get.overload('java.lang.String', 'java.lang.String').implementation = function (key, def) {
            const fake = getFakeForKeyJS(key);
            if (fake !== null) {
                const original = this.get(key, def);
//                console.log(`[JAVA] SystemProperties.get("${key}", "${def}"): "${original}" -> "${fake}"`);
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
    // SELF-TEST (runs inside same Java.perform, after all assignments)
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

'use strict';

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ===== VALUE POOLS =====
// Each array has 20 entries; all arrays share the same index so that
// model/manufacturer/brand/device/board/hardware/fingerprint/display/bootloader/product
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
        // idx=0  Pixel 8           brand=google   product=husky      device=husky      os=14 display=UP1A.231005.007
        "google/husky/husky:14/UP1A.231005.007/10754064:user/release-keys",
        // idx=1  Galaxy S21        brand=samsung  product=o1sxxx     device=o1s        os=13 display=TP1A.220624.014
        "samsung/o1sxxx/o1s:13/TP1A.220624.014/G991BXXU5CWLA:user/release-keys",
        // idx=2  Mi 13             brand=xiaomi   product=nuwa       device=nuwa       os=12 display=TKQ1.221114.001
        "xiaomi/nuwa/nuwa:12/TKQ1.221114.001/V14.0.6.0.TMACNXM:user/release-keys",
        // idx=3  OnePlus 11        brand=oneplus  product=OP11       device=OP11       os=13 display=SKQ1.221119.001
        "oneplus/OP11/OP11:13/SKQ1.221119.001/T.13f6a92_f7bf:user/release-keys",
        // idx=4  Vivo X90          brand=vivo     product=V2185A     device=vivoX90    os=14 display=TP1A.220624.014
        "vivo/V2185A/vivoX90:14/TP1A.220624.014/compiler09101556:user/release-keys",
        // idx=5  Pixel 7 Pro       brand=google   product=cheetah    device=cheetah    os=14 display=UP1A.231005.007
        "google/cheetah/cheetah:14/UP1A.231005.007/10754064:user/release-keys",
        // idx=6  Galaxy S22 Ultra  brand=samsung  product=b0sxx      device=b0s        os=13 display=TP1A.220624.014
        "samsung/b0sxx/b0s:13/TP1A.220624.014/S908BXXU4CWLB:user/release-keys",
        // idx=7  Xiaomi 12         brand=xiaomi   product=zeus       device=zeus       os=12 display=SKQ1.211006.001
        "xiaomi/zeus/zeus:12/SKQ1.211006.001/V13.0.2.0.SKACNXM:user/release-keys",
        // idx=8  OnePlus 10 Pro    brand=oneplus  product=OnePlus10Pro device=OP10Pro  os=13 display=SKQ1.221119.001
        "oneplus/OnePlus10Pro/OP10Pro:13/SKQ1.221119.001/T.13f6a92:user/release-keys",
        // idx=9  Vivo Y33s         brand=vivo     product=V2145      device=V2145      os=11 display=RP1A.200720.012
        "vivo/V2145/V2145:11/RP1A.200720.012/compiler09072355:user/release-keys",
        // idx=10 Galaxy A54        brand=samsung  product=a54xxx     device=a54x       os=13 display=TP1A.220624.014
        "samsung/a54xxx/a54x:13/TP1A.220624.014/A546BXXS4CWJ5:user/release-keys",
        // idx=11 Xiaomi 13 Pro     brand=xiaomi   product=fuxi       device=fuxi       os=13 display=TKQ1.221114.001
        "xiaomi/fuxi/fuxi:13/TKQ1.221114.001/V14.0.4.0.TMACNXM:user/release-keys",
        // idx=12 Pixel 6a          brand=google   product=bluejay    device=bluejay    os=14 display=AP1A.240405.002
        "google/bluejay/bluejay:14/AP1A.240405.002/11480754:user/release-keys",
        // idx=13 Realme 11 Pro     brand=realme   product=RMX3760    device=RMX3760    os=13 display=TP1A.220624.014
        "realme/RMX3760/RMX3760:13/TP1A.220624.014/S.202308012255:user/release-keys",
        // idx=14 OnePlus Nord CE 3 brand=oneplus  product=ovaltine   device=ovaltine   os=13 display=SKQ1.221119.001
        "oneplus/ovaltine/ovaltine:13/SKQ1.221119.001/T.1234abcd:user/release-keys",
        // idx=15 Galaxy Z Fold5    brand=samsung  product=q5qxx      device=q5q        os=13 display=TP1A.220624.014
        "samsung/q5qxx/q5q:13/TP1A.220624.014/F946BXXU1AWI3:user/release-keys",
        // idx=16 Xiaomi 14         brand=xiaomi   product=houji      device=houji      os=14 display=UKQ1.230804.001
        "xiaomi/houji/houji:14/UKQ1.230804.001/V816.0.3.0.UNACNXM:user/release-keys",
        // idx=17 Pixel 8 Pro       brand=google   product=shiba      device=shiba      os=14 display=UP1A.231005.007
        "google/shiba/shiba:14/UP1A.231005.007/10754064:user/release-keys",
        // idx=18 OnePlus 9 Pro     brand=oneplus  product=lemonadep  device=lemonadep  os=12 display=SKQ1.210216.001
        "oneplus/lemonadep/lemonadep:12/SKQ1.210216.001/R.202205031254:user/release-keys",
        // idx=19 Galaxy S21 FE     brand=samsung  product=r8qxx      device=r8q        os=13 display=TP1A.220624.014
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
        "user", "user", "user", "user", "user",
        "user", "user", "user", "user", "user",
        "user", "user", "user", "user", "user",
        "user", "user", "user", "user", "user"
    ],
    os_version: [
        "10", "11", "12", "13", "14",
        "14", "13", "12", "13", "11",
        "13", "13", "14", "13", "13",
        "13", "14", "14", "12", "13"
    ],
    // SDK_INT must match os_version: 10->29, 11->30, 12->31, 13->33, 14->34
    sdk_int: [
        29, 30, 31, 33, 34,
        34, 33, 31, 33, 30,
        33, 33, 34, 33, 33,
        33, 34, 34, 31, 33
    ],
    // Build.PRODUCT — matches ro.product.name, always consistent with device/brand
    product: [
        "husky",          // Pixel 8           (google)
        "o1sxxx",         // Galaxy S21         (samsung)
        "nuwa",           // Mi 13 / Xiaomi 13  (xiaomi)
        "OP11",           // OnePlus 11         (oneplus)
        "V2185A",         // Vivo X90           (vivo)
        "cheetah",        // Pixel 7 Pro        (google)
        "b0sxx",          // Galaxy S22 Ultra   (samsung)
        "zeus",           // Xiaomi 12          (xiaomi)
        "OnePlus10Pro",   // OnePlus 10 Pro     (oneplus)
        "V2145",          // Vivo Y33s          (vivo)
        "a54xxx",         // Galaxy A54         (samsung)
        "fuxi",           // Xiaomi 13 Pro      (xiaomi)
        "bluejay",        // Pixel 6a           (google)
        "RMX3760",        // Realme 11 Pro      (realme)
        "ovaltine",       // OnePlus Nord CE 3  (oneplus)
        "q5qxx",          // Galaxy Z Fold5     (samsung)
        "houji",          // Xiaomi 14          (xiaomi)
        "shiba",          // Pixel 8 Pro        (google)
        "lemonadep",      // OnePlus 9 Pro      (oneplus)
        "r8qxx"           // Galaxy S21 FE      (samsung)
    ],
    // Build.TAGS — real devices always ship with "release-keys"
    tags: [
        "release-keys","release-keys","release-keys","release-keys","release-keys",
        "release-keys","release-keys","release-keys","release-keys","release-keys",
        "release-keys","release-keys","release-keys","release-keys","release-keys",
        "release-keys","release-keys","release-keys","release-keys","release-keys"
    ],
    // Build.TIME — plausible epoch ms per device profile (2022-2024 range)
    build_time: [
        1697155200000, 1672531200000, 1651363200000, 1667260800000, 1697155200000,
        1697155200000, 1669852800000, 1651363200000, 1667260800000, 1638316800000,
        1669852800000, 1667260800000, 1712361600000, 1690848000000, 1678233600000,
        1669852800000, 1693526400000, 1697155200000, 1651363200000, 1669852800000
    ],
    // Kernel/os.version strings — realistic for each SoC
    os_kernel: [
        "5.15.104-android14-11-00001-g9b6e5d8c8c5c","5.4.210-lineage","5.10.157-android13-9","5.4.231-lineage","5.15.78-android13-8",
        "5.15.104-android14-4-00001","5.10.157-android13-9","5.10.149-android12-9","5.4.231-lineage","5.4.210-android11-7",
        "5.10.157-android13-9","5.10.149-android13-7","5.10.177-android13-4","5.10.157-android13-8","5.10.149-android13-6",
        "5.10.157-android13-9","5.15.78-android14-4","5.15.104-android14-11-00001","5.4.231-android12-5","5.4.210-android13-9"
    ],
    // Operator name per profile: US carriers only
    operator_name: [
        "T-Mobile","Verizon","AT&T","T-Mobile","Verizon",
        "AT&T","T-Mobile","Verizon","AT&T","T-Mobile",
        "Verizon","AT&T","T-Mobile","Verizon","AT&T",
        "T-Mobile","Verizon","AT&T","T-Mobile","Verizon"
    ],
    // Screen resolution [width, height] per profile
    screen_width:  [1080,1080,1080,1080,1080, 1440,1080,1080,1440,720, 1080,1440,1080,1080,1080, 2176,1440,1344,1080,1080],
    screen_height: [2400,2400,2340,2400,2376, 3120,2340,2400,3216,1600,2340,3200,2400,2400,2412, 1812,3200,2992,2412,2400],
    // Locale per profile — US English only
    locale: [
        "en_US","en_US","en_US","en_US","en_US",
        "en_US","en_US","en_US","en_US","en_US",
        "en_US","en_US","en_US","en_US","en_US",
        "en_US","en_US","en_US","en_US","en_US"
    ],
    // Battery level (%) per profile — realistic mid-range values
    battery_level: [
        72,85,63,91,77, 55,88,44,66,33, 79,92,51,68,84, 37,73,61,89,47
    ]
};

// =======================
// PRE-SELECTED RANDOM VALUES (chosen once at startup)
// =======================
const idx = Math.floor(Math.random() * profiles.model.length);
const selected = {
    android_id:    randomChoice(profiles.android_id),
    model:         profiles.model[idx],
    manufacturer:  profiles.manufacturer[idx],
    brand:         profiles.brand[idx],
    device:        profiles.device[idx],
    board:         profiles.board[idx],
    hardware:      profiles.hardware[idx],
    fingerprint:   profiles.fingerprint[idx],
    display:       profiles.display[idx],
    bootloader:    profiles.bootloader[idx],
    user:          profiles.user[idx],
    os_version:    profiles.os_version[idx],
    sdk_int:       profiles.sdk_int[idx],
    product:       profiles.product[idx],
    tags:          profiles.tags[idx],
    build_time:    profiles.build_time[idx],
    os_kernel:     profiles.os_kernel[idx],
    operator_name: profiles.operator_name[idx],
    screen_width:  profiles.screen_width[idx],
    screen_height: profiles.screen_height[idx],
    locale:        profiles.locale[idx],
    battery_level: profiles.battery_level[idx]
};
console.log("[*] Selected profile:", JSON.stringify(selected));

// =======================
// SHARED HELPERS & PROP MAP
// =======================
const propMap = {
    "ro.build.version.release": "os_version",
    "ro.build.version.sdk":     "sdk_int",
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
    "ro.product.name":          "product",
    "ro.build.user":            "user",
    "ro.build.tags":            "tags",
    "ro.build.version.release_or_codename": "os_version"
};

function getFakeForKeyJS(key) {
    const poolName = propMap[key];
    if (!poolName) return null;
    const v = selected[poolName];
    return (v !== undefined && v !== null) ? String(v) : null;
}

// =======================
// JAVA HOOKS
// =======================
Java.perform(function () {

    const Build   = Java.use("android.os.Build");
    const VERSION = Java.use("android.os.Build$VERSION");

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
    assignField(Build, "PRODUCT",      selected.product);
    assignField(Build, "USER",         selected.user);
    // TAGS must be "release-keys" — critical for root/test-keys detection
    assignField(Build, "TAGS",         selected.tags);
    // Build.TIME — epoch ms of build date
    assignField(Build, "TIME",         selected.build_time);
    assignField(VERSION, "RELEASE",    selected.os_version);
    assignField(VERSION, "SDK_INT",    selected.sdk_int);
    try {
        const origSdkStr = VERSION.SDK.value;
        VERSION.SDK.value = String(selected.sdk_int);
        console.log(`[JAVA] SDK: "${origSdkStr}" -> "${selected.sdk_int}"`);
    } catch (e) {
        console.log(`[JAVA] WARN could not set SDK: ${e.message}`);
    }

    // =======================
    // SystemProperties hook
    // =======================
    try {
        const SystemProperties = Java.use("android.os.SystemProperties");

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

    // =======================
    // ANDROID_ID
    // =======================
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
    // System.getProperty("os.version") — kernel version string
    // =======================
    try {
        const System = Java.use("java.lang.System");
        System.getProperty.overload('java.lang.String').implementation = function (key) {
            if (key === "os.version") {
                const original = this.getProperty(key);
                const fake = selected.os_kernel;
                console.log(`[JAVA] System.getProperty("os.version"): "${original}" -> "${fake}"`);
                return fake;
            }
            return this.getProperty(key);
        };
        System.getProperty.overload('java.lang.String', 'java.lang.String').implementation = function (key, def) {
            if (key === "os.version") {
                const original = this.getProperty(key, def);
                const fake = selected.os_kernel;
                console.log(`[JAVA] System.getProperty("os.version", def): "${original}" -> "${fake}"`);
                return fake;
            }
            return this.getProperty(key, def);
        };
        console.log("[JAVA] System.getProperty hooked");
    } catch (e) {
        console.log("[JAVA] WARN System.getProperty hook failed: " + e.message);
    }

    // =======================
    // DisplayMetrics — widthPixels / heightPixels (screen resolution)
    // =======================
    try {
        const DisplayMetrics = Java.use("android.util.DisplayMetrics");
        // Hook toString as a lightweight probe; the real patch is via field intercept.
        // The most reliable approach: hook Resources.getDisplayMetrics() and patch result.
        const Resources = Java.use("android.content.res.Resources");
        // Patch the static getSystem().displayMetrics path used by PX SDK
        const origGetSystem = Resources.getSystem;
        Resources.getSystem.implementation = function () {
            const res = this.getSystem();
            try {
                const dm = res.getDisplayMetrics();
                const origW = dm.widthPixels;
                const origH = dm.heightPixels;
                dm.widthPixels  = selected.screen_width;
                dm.heightPixels = selected.screen_height;
                if (origW !== selected.screen_width || origH !== selected.screen_height) {
                    console.log(`[JAVA] DisplayMetrics: "${origW}x${origH}" -> "${selected.screen_width}x${selected.screen_height}"`);
                }
            } catch (ex) { /* ignore */ }
            return res;
        };
        console.log("[JAVA] Resources.getSystem hooked for DisplayMetrics");
    } catch (e) {
        console.log("[JAVA] WARN DisplayMetrics hook failed: " + e.message);
    }

    // =======================
    // Settings.System.getInt("screen_brightness") — return realistic value 128
    // =======================
    try {
        const SettingsSystem = Java.use("android.provider.Settings$System");
        SettingsSystem.getInt.overload(
            'android.content.ContentResolver', 'java.lang.String'
        ).implementation = function (resolver, name) {
            if (name === "screen_brightness") {
                const original = this.getInt(resolver, name);
                console.log(`[JAVA] Settings.System.getInt("screen_brightness"): "${original}" -> "128"`);
                return 128;
            }
            return this.getInt(resolver, name);
        };
        SettingsSystem.getInt.overload(
            'android.content.ContentResolver', 'java.lang.String', 'int'
        ).implementation = function (resolver, name, def) {
            if (name === "screen_brightness") {
                const original = this.getInt(resolver, name, def);
                console.log(`[JAVA] Settings.System.getInt("screen_brightness", def): "${original}" -> "128"`);
                return 128;
            }
            return this.getInt(resolver, name, def);
        };
        console.log("[JAVA] Settings.System.getInt hooked");
    } catch (e) {
        console.log("[JAVA] WARN Settings.System.getInt hook failed: " + e.message);
    }

    // =======================
    // TelephonyManager — operator name, SIM state, network type
    // =======================
    try {
        const TelephonyManager = Java.use("android.telephony.TelephonyManager");

        // getNetworkOperatorName has two overloads: () and (int subId)
        TelephonyManager.getNetworkOperatorName.overload().implementation = function () {
            const fake = selected.operator_name;
            console.log(`[JAVA] getNetworkOperatorName: -> "${fake}"`);
            return fake;
        };
        try {
            TelephonyManager.getNetworkOperatorName.overload('int').implementation = function (subId) {
                const fake = selected.operator_name;
                console.log(`[JAVA] getNetworkOperatorName(subId): -> "${fake}"`);
                return fake;
            };
        } catch (e2) { /* overload may not exist on all API levels */ }

        // SIM_STATE_READY = 5 — device has a SIM inserted and ready
        TelephonyManager.getSimState.overload().implementation = function () {
            const original = this.getSimState();
            console.log(`[JAVA] getSimState: "${original}" -> "5" (SIM_STATE_READY)`);
            return 5;
        };

        // NETWORK_TYPE_LTE = 13 — wrap in try to handle SecurityException on some devices
        try {
            TelephonyManager.getNetworkType.overload().implementation = function () {
                try {
                    const original = this.getNetworkType();
                    console.log(`[JAVA] getNetworkType: "${original}" -> "13" (LTE)`);
                } catch (se) { /* SecurityException — original read suppressed */ }
                return 13;
            };
        } catch (e3) {
            console.log("[JAVA] WARN getNetworkType overload not found: " + e3.message);
        }

        console.log("[JAVA] TelephonyManager hooked");
    } catch (e) {
        console.log("[JAVA] WARN TelephonyManager hook failed: " + e.message);
    }

    // =======================
    // PackageManager.hasSystemFeature — GPS, gyro, accel, ethernet, touch, NFC, WiFi
    // Features that a real mid-range phone has: all true except ethernet (false)
    // =======================
    try {
        const PackageManager = Java.use("android.content.pm.PackageManager");

        // Features always present on a real phone
        const pmAlwaysTrue = [
            "android.hardware.location.gps",
            "android.hardware.sensor.gyroscope",
            "android.hardware.sensor.accelerometer",
            "android.hardware.touchscreen",
            "android.hardware.wifi",
            "android.hardware.nfc"
        ];
        // Features never present on a phone
        const pmAlwaysFalse = [
            "android.hardware.ethernet"
        ];

        function applyFeatureHook(cls, label) {
            try {
                const ov1 = cls.hasSystemFeature.overload('java.lang.String');
                const ov2 = cls.hasSystemFeature.overload('java.lang.String', 'int');

                ov1.implementation = function (feature) {
                    if (pmAlwaysTrue.indexOf(feature) !== -1)  return true;
                    if (pmAlwaysFalse.indexOf(feature) !== -1) return false;
                    return ov1.call(this, feature);
                };

                ov2.implementation = function (feature, version) {
                    if (pmAlwaysTrue.indexOf(feature) !== -1)  return true;
                    if (pmAlwaysFalse.indexOf(feature) !== -1) return false;
                    return ov2.call(this, feature, version);
                };

                console.log(`[JAVA] ${label}.hasSystemFeature hooked`);
            } catch (ex) {
                console.log(`[JAVA] WARN ${label}.hasSystemFeature hook failed: ${ex.message}`);
            }
        }

        // Hook abstract base class
        applyFeatureHook(PackageManager, "PackageManager");

        // Hook the concrete class returned by Context.getPackageManager()
        try {
            const AppPM = Java.use("android.app.ApplicationPackageManager");
            applyFeatureHook(AppPM, "ApplicationPackageManager");
        } catch (ex) {
            console.log("[JAVA] WARN ApplicationPackageManager not found: " + ex.message);
        }

        console.log("[JAVA] PackageManager.hasSystemFeature hooked");
    } catch (e) {
        console.log("[JAVA] WARN PackageManager.hasSystemFeature hook failed: " + e.message);
    }

    // =======================
    // Battery BroadcastReceiver — spoof health/level/plugged/status/temperature/voltage/technology
    // The PX SDK calls context.registerReceiver(receiver, filter("android.intent.action.BATTERY_CHANGED"))
    // and reads extras from the returned sticky Intent. Hook Intent.getIntExtra / getStringExtra.
    // =======================
    try {
        const Intent = Java.use("android.content.Intent");

        Intent.getIntExtra.implementation = function (name, defaultValue) {
            const action = this.getAction();
            if (action === "android.intent.action.BATTERY_CHANGED") {
                const original = this.getIntExtra(name, defaultValue);
                let fake = null;
                switch (name) {
                    case "health":      fake = 2;    break; // BATTERY_HEALTH_GOOD
                    case "level":       fake = selected.battery_level; break;
                    case "plugged":     fake = 0;    break; // not plugged in
                    case "status":      fake = 3;    break; // BATTERY_STATUS_DISCHARGING
                    case "temperature": fake = 280;  break; // 28.0 °C
                    case "voltage":     fake = 3900; break; // 3900 mV
                    default: break;
                }
                if (fake !== null) {
                    console.log(`[JAVA] Battery.getIntExtra("${name}"): "${original}" -> "${fake}"`);
                    return fake;
                }
            }
            return this.getIntExtra(name, defaultValue);
        };

        Intent.getStringExtra.implementation = function (name) {
            const action = this.getAction();
            if (action === "android.intent.action.BATTERY_CHANGED") {
                if (name === "technology") {
                    const original = this.getStringExtra(name);
                    console.log(`[JAVA] Battery.getStringExtra("technology"): "${original}" -> "Li-ion"`);
                    return "Li-ion";
                }
            }
            return this.getStringExtra(name);
        };

        console.log("[JAVA] Intent battery extras hooked");
    } catch (e) {
        console.log("[JAVA] WARN Intent hook failed: " + e.message);
    }

    // =======================
    // Locale.getDefault() — spoof to match selected profile
    // getDefault() is STATIC — do NOT call this.getDefault() inside (infinite recursion).
    // All profiles use en_US so we return the permanent Locale.US static constant directly.
    // This avoids ALL construction/retain/wrapper-disposal issues entirely.
    // =======================
    // =======================
    // Locale spoofing — spoof to en_US
    // Hooking getDefault() to return a Java object always fails with
    // "expected return value compatible with java.util.Locale" because
    // Frida disposes the wrapper between calls from non-Java threads.
    // Solution: hook the String-returning methods that callers actually read.
    // =======================
    try {
        const Locale = Java.use("java.util.Locale");

        // toString() returns "en_US" format
        Locale.toString.implementation = function () {
            const orig = this.toString();
            // Only spoof if this instance came from getDefault() context
            // (i.e. it is not already en_US and not a constant like Locale.ENGLISH)
            return "en_US";
        };

        // getLanguage() — returns "en"
        Locale.getLanguage.implementation = function () {
            return "en";
        };

        // getCountry() — returns "US"
        Locale.getCountry.implementation = function () {
            return "US";
        };

        // toLanguageTag() — returns "en-US" (BCP-47)
        try {
            Locale.toLanguageTag.implementation = function () {
                return "en-US";
            };
        } catch (e2) { /* API level may not have this */ }

        // getDisplayLanguage / getDisplayCountry for completeness
        try {
            Locale.getDisplayLanguage.overload().implementation = function () { return "English"; };
            Locale.getDisplayCountry.overload().implementation  = function () { return "United States"; };
        } catch (e3) { /* ignore */ }

        console.log("[JAVA] Locale hooked -> en_US (via instance methods)");
    } catch (e) {
        console.log("[JAVA] WARN Locale hook failed: " + e.message);
    }

    // =======================
    // Root detection — File.exists() for common su/root paths
    // The PX SDK's m55a() calls new File(path).exists() for each entry in
    // C0041i.f69c (a list of root indicator paths like /system/bin/su).
    // Return false for all known root paths.
    // =======================
    try {
        const File = Java.use("java.io.File");
        const rootPaths = [
            "/system/bin/su", "/system/xbin/su", "/sbin/su", "/system/su",
            "/system/bin/.ext/.su", "/system/usr/we-need-root/su-backup",
            "/system/xbin/mu", "/data/local/su", "/data/local/bin/su",
            "/data/local/xbin/su", "/system/sd/xbin/su", "/system/bin/failsafe/su",
            "/dev/com.koushikdutta.superuser.daemon", "/system/app/Superuser.apk",
            "/system/app/SuperSU.apk", "/system/app/Kinguser.apk",
            "/data/data/com.noshufou.android.su", "/data/data/eu.chainfire.supersu",
            "/data/data/com.koushikdutta.superuser", "/data/data/com.topjohnwu.magisk",
            "/sbin/.magisk", "/sbin/.core/bin"
        ];

        File.exists.implementation = function () {
            const path = this.getAbsolutePath();
            if (rootPaths.indexOf(path) !== -1) {
                console.log(`[JAVA] File.exists("${path}") -> false (anti-root spoofed)`);
                return false;
            }
            return this.exists();
        };

        console.log("[JAVA] File.exists hooked for root path suppression");
    } catch (e) {
        console.log("[JAVA] WARN File.exists hook failed: " + e.message);
    }

    // =======================
    // Root detection — Runtime.exec("...su...")
    // C0058j.m58a() runs: Runtime.getRuntime().exec("/system/xbin/which su")
    // The catch clause sets z=false, so we simply throw an IOException to land there.
    // =======================
    try {
        const Runtime     = Java.use("java.lang.Runtime");
        const IOException = Java.use("java.io.IOException");

        const suKeywords = ["which su", "/system/xbin/su", "/system/bin/su", "busybox"];

        function isSuCommand(cmd) {
            if (!cmd) return false;
            for (let i = 0; i < suKeywords.length; i++) {
                if (cmd.indexOf(suKeywords[i]) !== -1) return true;
            }
            return false;
        }

        // overload(String) — exec("cmd")
        Runtime.exec.overload('java.lang.String').implementation = function (cmd) {
            if (isSuCommand(cmd)) {
                console.log(`[JAVA] Runtime.exec("${cmd}") -> throw IOException (anti-root)`);
                throw IOException.$new("Permission denied");
            }
            return this.exec(cmd);
        };

        // overload(String[]) — exec(["cmd", ...])
        Runtime.exec.overload('[Ljava.lang.String;').implementation = function (cmdArr) {
            const joined = cmdArr ? cmdArr.join(" ") : "";
            if (isSuCommand(joined)) {
                console.log(`[JAVA] Runtime.exec([${joined}]) -> throw IOException (anti-root)`);
                throw IOException.$new("Permission denied");
            }
            return this.exec(cmdArr);
        };

        // overload(String, String[]) — exec("cmd", envp)
        Runtime.exec.overload('java.lang.String', '[Ljava.lang.String;').implementation = function (cmd, envp) {
            if (isSuCommand(cmd)) {
                console.log(`[JAVA] Runtime.exec("${cmd}", envp) -> throw IOException (anti-root)`);
                throw IOException.$new("Permission denied");
            }
            return this.exec(cmd, envp);
        };

        // overload(String[], String[]) — exec(cmdArr, envp)
        Runtime.exec.overload('[Ljava.lang.String;', '[Ljava.lang.String;').implementation = function (cmdArr, envp) {
            const joined = cmdArr ? cmdArr.join(" ") : "";
            if (isSuCommand(joined)) {
                console.log(`[JAVA] Runtime.exec([${joined}], envp) -> throw IOException (anti-root)`);
                throw IOException.$new("Permission denied");
            }
            return this.exec(cmdArr, envp);
        };

        // overload(String[], String[], File) — exec(cmdArr, envp, dir)
        Runtime.exec.overload('[Ljava.lang.String;', '[Ljava.lang.String;', 'java.io.File').implementation = function (cmdArr, envp, dir) {
            const joined = cmdArr ? cmdArr.join(" ") : "";
            if (isSuCommand(joined)) {
                console.log(`[JAVA] Runtime.exec([${joined}], envp, dir) -> throw IOException (anti-root)`);
                throw IOException.$new("Permission denied");
            }
            return this.exec(cmdArr, envp, dir);
        };

        console.log("[JAVA] Runtime.exec hooked for su/which suppression");
    } catch (e) {
        console.log("[JAVA] WARN Runtime.exec hook failed: " + e.message);
    }

    // =======================
    // SELF-TEST
    // =======================
    Java.scheduleOnMainThread(function () {
        console.log("\n========== SELF-TEST ==========");

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
            ["PRODUCT",         BuildT.PRODUCT.value,      selected.product],
            ["TAGS",            BuildT.TAGS.value,         selected.tags],
            ["VERSION.RELEASE", VERSIONT.RELEASE.value,    selected.os_version],
            ["VERSION.SDK_INT", VERSIONT.SDK_INT.value,    selected.sdk_int],
            ["VERSION.SDK",     VERSIONT.SDK.value,        String(selected.sdk_int)],
        ];

        javaChecks.forEach(function ([field, actual, expect]) {
            const ok = String(actual) === String(expect);
            console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} ${field}: got="${actual}" want="${expect}"`);
        });

        // android_id
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

        // System.getProperty("os.version")
        try {
            const System = Java.use("java.lang.System");
            const kernel = System.getProperty("os.version");
            const ok = kernel === selected.os_kernel;
            console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} os.version: got="${kernel}" want="${selected.os_kernel}"`);
        } catch (e) {
            console.log("[JAVA] SKIP os.version: " + e.message);
        }

        // Settings.System.getInt("screen_brightness")
        try {
            const ctx2 = Java.use("android.app.ActivityThread")
                             .currentApplication()
                             .getApplicationContext();
            const SettingsSystem = Java.use("android.provider.Settings$System");
            const brightness = SettingsSystem.getInt(ctx2.getContentResolver(), "screen_brightness");
            const ok = brightness === 128;
            console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} screen_brightness: got="${brightness}" want="128"`);
        } catch (e) {
            console.log("[JAVA] SKIP screen_brightness: " + e.message);
        }

        // TelephonyManager
        try {
            const ctx3 = Java.use("android.app.ActivityThread")
                             .currentApplication()
                             .getApplicationContext();
            const TM = ctx3.getSystemService("phone");
            const JavaTM = Java.cast(TM, Java.use("android.telephony.TelephonyManager"));

            try {
                const opName = JavaTM.getNetworkOperatorName();
                console.log(`[JAVA] ${opName === selected.operator_name ? "PASS" : "FAIL"} operatorName: got="${opName}" want="${selected.operator_name}"`);
            } catch (e1) {
                console.log("[JAVA] SKIP operatorName: " + e1.message);
            }

            try {
                const simState = JavaTM.getSimState();
                console.log(`[JAVA] ${simState === 5 ? "PASS" : "FAIL"} simState: got="${simState}" want="5"`);
            } catch (e2) {
                console.log("[JAVA] SKIP simState: " + e2.message);
            }

            try {
                const netType = JavaTM.getNetworkType();
                console.log(`[JAVA] ${netType === 13 ? "PASS" : "FAIL"} networkType: got="${netType}" want="13"`);
            } catch (e3) {
                console.log("[JAVA] SKIP networkType (SecurityException expected on emulator): " + e3.message);
            }
        } catch (e) {
            console.log("[JAVA] SKIP TelephonyManager: " + e.message);
        }

        // Locale — verify via string methods (getDefault() object hook is not used)
        try {
            const LocaleT = Java.use("java.util.Locale");
            const def = LocaleT.getDefault();
            const lang    = def.getLanguage();
            const country = def.getCountry();
            const str     = def.toString();
            console.log(`[JAVA] ${lang === "en"   ? "PASS" : "FAIL"} locale.language: got="${lang}" want="en"`);
            console.log(`[JAVA] ${country === "US" ? "PASS" : "FAIL"} locale.country:  got="${country}" want="US"`);
            console.log(`[JAVA] ${str === "en_US"  ? "PASS" : "FAIL"} locale.toString: got="${str}" want="en_US"`);
        } catch (e) {
            console.log("[JAVA] SKIP locale: " + e.message);
        }

        // PackageManager features
        try {
            const ctx4 = Java.use("android.app.ActivityThread")
                             .currentApplication()
                             .getApplicationContext();
            const pm = ctx4.getPackageManager();
            const featureTests = [
                ["android.hardware.location.gps", true],
                ["android.hardware.sensor.gyroscope", true],
                ["android.hardware.sensor.accelerometer", true],
                ["android.hardware.touchscreen", true],
                ["android.hardware.wifi", true],
                ["android.hardware.nfc", true],
                ["android.hardware.ethernet", false],
            ];
            featureTests.forEach(function ([feature, expected]) {
                try {
                    const actual = pm.hasSystemFeature(feature);
                    const ok = actual === expected;
                    const shortName = feature.replace("android.hardware.", "");
                    console.log(`[JAVA] ${ok ? "PASS" : "FAIL"} feature(${shortName}): got="${actual}" want="${expected}"`);
                } catch (fe) {
                    const shortName = feature.replace("android.hardware.", "");
                    console.log(`[JAVA] SKIP feature(${shortName}): ${fe.message}`);
                }
            });
        } catch (e) {
            console.log("[JAVA] SKIP PackageManager features: " + e.message);
        }

        // Build.TAGS root check
        try {
            const tagsVal = Java.use("android.os.Build").TAGS.value;
            const hasTestKeys = tagsVal.indexOf("test-keys") !== -1;
            console.log(`[JAVA] ${!hasTestKeys ? "PASS" : "FAIL"} TAGS root-check: got="${tagsVal}" (test-keys=${hasTestKeys})`);
        } catch (e) {
            console.log("[JAVA] SKIP TAGS root-check: " + e.message);
        }

        // Runtime.exec("which su") root check — mirrors C0058j.m58a()
        // PASS = IOException thrown → caught → z=false (not rooted)
        try {
            const RuntimeT = Java.use("java.lang.Runtime");
            let exceptionThrown = false;
            try {
                RuntimeT.getRuntime().exec("/system/xbin/which su");
            } catch (ioEx) {
                exceptionThrown = true;
            }
            console.log(`[JAVA] ${exceptionThrown ? "PASS" : "FAIL"} Runtime.exec which-su root-check: IOException thrown=${exceptionThrown}`);
        } catch (e) {
            console.log("[JAVA] SKIP Runtime.exec which-su root-check: " + e.message);
        }

        // SystemProperties
        try {
            const SP = Java.use("android.os.SystemProperties");
            const nativeChecks = [
                ["ro.product.model",         selected.model],
                ["ro.product.manufacturer",  selected.manufacturer],
                ["ro.product.brand",         selected.brand],
                ["ro.product.device",        selected.device],
                ["ro.product.name",          selected.product],
                ["ro.build.version.release", selected.os_version],
                ["ro.build.version.sdk",     String(selected.sdk_int)],
                ["ro.build.fingerprint",     selected.fingerprint],
                ["ro.build.tags",            selected.tags],
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

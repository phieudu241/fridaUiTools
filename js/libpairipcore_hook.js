//var dlopen = Module.findExportByName(null, "dlopen");
//
//Interceptor.attach(dlopen, {
//    onEnter: function(args) {
//        this.lib = Memory.readCString(args[0]);
//    },
//    onLeave: function(retval) {
//        if (this.lib.indexOf("libpairipcore.so") !== -1) {
//            console.log("libpairipcore loaded");
//
//            var base = Module.findBaseAddress("libpairipcore.so");
//            console.log("base:", base);
//        }
//    }
//});


function hookFunc(name) {
    var addr = Module.findExportByName("libpairipcore.so", name);

    if (!addr) {
        console.log(name + " not found");
        return;
    }

    console.log(name + " address:", addr);

    Interceptor.attach(addr, {
        onEnter: function(args) {
            console.log("\n==== " + name + " called ====");

            console.log(
                Thread.backtrace(this.context, Backtracer.ACCURATE)
                .map(DebugSymbol.fromAddress)
                .join("\n")
            );
        }
    });
}

hookFunc("executeProgram");
hookFunc("executeVM");
var ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();

var Adapter = {
	contextHandler : new android.os.Handler(ctx.getMainLooper()),
	init : function() {
		this.contextHandler.post({
			run : function() {
				if (this.connected) return;
				Adapter.connect();
				Adapter.contextHandler.postDelayed(this, 10000);
			}
		});
	},
	connect : function() {
		if (this.connected) return;
		try {
			var intent = new android.content.Intent("com.xero.ca.GameBridge");
			intent.setComponent(new android.content.ComponentName("com.xero.ca", "com.xero.ca.GameBridgeService"));
			ctx.bindService(intent, this.connection, ctx.BIND_AUTO_CREATE);
		} catch(e) {
			this.toast("无法连接至命令助手安卓版\n" + e);
		}
	},
	disconnect : function() {
		if (!this.connected) return;
		ctx.unbindService(this.connection);
	},
	connection : new android.content.ServiceConnection({
		onServiceConnected : function(cn, binder) {
			Adapter.onConnected(cn, binder);
		},
		onServiceDisconnected : function(cn) {
			Adapter.onDisconnected(cn);
		}
	}),
	handler : new android.os.Handler.Callback({
		handleMessage : function(msg) {
			Adapter.onReceive(msg);
			return false;
		}
	}),
	onConnected : function(cn, binder) {
		if (binder == null) {
			this.toast("命令助手安卓版已经与一个适配器连接。");
			return;
		}
		this.connected = true;
		this.remote = new android.os.Messenger(binder);
		this.client = new android.os.Messenger(new android.os.Handler(this.handler));
		this.pid = android.os.Process.myPid();
		this.sendInit();
	},
	onDisconnected : function(cn) {
		this.connected = false;
		this.remote = null;
		this.toast("命令助手已断开与适配器的连接");
	},
	onReceive : function(msg) {
		if (msg.what == 2) return this.sendInit();
		
	},
	toast : function(s) {
		ctx.runOnUiThread(function() {
			android.widget.Toast.makeText(ctx, s, 0).show();
		});
	},
	sendInit : function() {
		var self = this;
		this.send(function(bundle) {
			bundle.putString("action", "init");
			bundle.putString("platform", self.clientName);
			bundle.putInt("version", 2);
		});
	},
	send : function(f) {
		if (!this.remote) return;
		var msg = android.os.Message.obtain();
		var bundle = new android.os.Bundle();
		msg.what = 1;
		msg.replyTo = this.client;
		bundle.putInt("pid", this.pid);
		f(bundle);
		msg.setData(bundle);
		this.remote.send(msg);
	}
}

Adapter.clientName = "ModPE";
Adapter.init();

var z = 0;
function modTick() {
	if (--z > 0) return;
	Adapter.send(data);
	z = 5;
}

(function(global) {
	[
		"attackHook",
		"chatHook",
		"continueDestroyBlock",
		"destroyBlock",
		"playerAddExpHook",
		"playerExpLevelChangeHook",
		"screenChangeHook",
		"newLevel",
		"startDestroyBlock",
		"leaveGame",
		"useItem"
	].forEach(function(e) {
		global[e] = function() {
			Adapter.send(event.bind(null, e, arguments));
		}
	});
})(this);

var info = new android.os.Bundle();
function data(bundle) {
	var p = Player.getEntity(), b = Level.getBiome(Player.getX(), Player.getZ());
	info.putStringArray("playernames", Server.getAllPlayerNames());
	info.putDoubleArray("playerposition", [Player.getX(), Player.getY(), Player.getZ()]);
	info.putDoubleArray("playerrotation", [Entity.getPitch(p), Entity.getYaw(p)]);
	info.putIntArray("pointedblockpos", [Player.getPointedBlockX(), Player.getPointedBlockY(), Player.getPointedBlockZ()]);
	info.putIntArray("pointedblockinfo", [Player.getPointedBlockId(), Player.getPointedBlockData(), Player.getPointedBlockSide()]);
	info.putString("levelbiome", String(Level.biomeIdToName(b) + "(" + b + ")"));
	info.putInt("levelbrightness", Level.getBrightness(Player.getX(), Player.getY(), Player.getZ()));
	info.putInt("leveltime", Level.getTime());
	bundle.putString("action", "info");
	bundle.putBundle("info", info);
}
function event(name, args, bundle) {
	var i, arr = [];
	for (i in args) arr.push(args[i]);
	bundle.putString("action", "event");
	bundle.putString("name", name);
	bundle.putString("param", JSON.stringify(arr));
}
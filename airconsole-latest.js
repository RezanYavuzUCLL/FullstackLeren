/**
 * AirConsole.
 * @copyright 2024 by N-Dream AG, Switzerland. All rights reserved.
 * @version 1.9.0
 *
 * IMPORTANT:
 * @see http://developers.airconsole.com/ for API documentation
 *
 * This file is grouped into the following chapters:
 * - Constants: Constants you should use
 * - Connectivity: Device Ids, connects and disconnects
 * - Messaging: Sending messages between devices
 * - Device States: Setting data for a device that is readable for all devices
 * - Profile data: User profile data, including nicknames and profile pictures
 * - Active players: Setting a couple of devices as active players for a game
 * - Controller Inputs: Special device inputs like device motion
 * - Ads: Showing ads and handling their events
 * - Premium: Handling premium users
 * - Navigation: Changing games and opening external links
 * - User Interface: Changing orientation
 * - Persistent Data: Storing data across sessions
 * - High Scores: Storing and retrieving high scores
 * - Environment Events: Events triggered by the real world
 *
 * If your prefer an event driven api with .on() .off() and .dispatch()
 * interface instead of sending messages,
 * @see http://github.com/AirConsole/airconsole-events/
 *
 */

/**
 * Your gateway object to AirConsole.
 * There are getter and setter functions for all properties.
 * Do not access properties of this object directly.
 * @constructor
 * @param {AirConsole~Config} opts - Constructor config, see bellow.
 * @return {AirConsoleObject} The AirConsole object.
 */
function AirConsole(opts) {
  this.init_(opts);
}
/**
 * The configuration for the AirConsole constructor.
 * @typedef {object} AirConsole~Config
 * @property {string} orientation - AirConsole.ORIENTATION_PORTRAIT or
 *           AirConsole.ORIENTATION_LANDSCAPE.
 * @property {boolean|undefined} synchronize_time - If set to true, you can
 *           call getServerTime() to get the time on the game server.
 *           Default is false.
 * @property {boolean|undefined} setup_document - Sets up the document so
 *           nothing is selectable, zoom is fixed to 1 and scrolling is
 *           disabled (iOS 8 clients drop out of fullscreen when scrolling).
 *           Default: true
 * @property {number|undefined} device_motion - If set, onDeviceMotion gets
 *           called every "device_motion" milliseconds with data from the
 *           accelerometer and the gyroscope. Only for controllers.
 * @property {boolean} translation - If an AirConsole translation file should
 *           be loaded.
 * @property {boolean} [silence_inactive_players] - If set, newly joining devices will be
 *           prompted to wait while an active game is going on.<br />
 *           To start a game round, call setActivePlayers(X) with X larger than 0 eg 1,2,3,...<br />
 *           To finish a game round, call setActivePlayers(0).<br />
 *           Default: true, unless the game uses the automatically upgrading API version.<br />
 *           See {@link https://developers.airconsole.com/#!/guides/player_silencing Player Silencing Guide} for details.<br />
 *           Added in 1.9.0
 */


/** ------------------------------------------------------------------------ *
 * @chapter                         CONSTANTS                                *
 * ------------------------------------------------------------------------- */

/**
 * The device ID of the game screen.
 * @constant {number}
 */
AirConsole.SCREEN = 0;

/**
 * The portrait orientation.
 * @constant {string}
 */
AirConsole.ORIENTATION_PORTRAIT = "portrait";

/**
 * The landscape orientation.
 * @constant {string}
 */
AirConsole.ORIENTATION_LANDSCAPE = "landscape";


/** ------------------------------------------------------------------------ *
 * @chapter                     CONNECTIVITY                                 *
 * @see         http://developers.airconsole.com/#!/guides/pong              *
 * ------------------------------------------------------------------------- */

/**
 * Gets called when the game console is ready.
 * This event also fires onConnect for all devices that already are
 * connected and have loaded your game.
 * This event also fires onCustomDeviceStateChange for all devices that are
 * connected, have loaded your game and have set a custom Device State.
 * @abstract
 * @param {string} code - The AirConsole join code.
 */
AirConsole.prototype.onReady = function(code) {};

/**
 * Gets called when a device has connected and loaded the game.
 * @abstract
 * @param {number} device_id - the device ID that loaded the game.
 */
AirConsole.prototype.onConnect = function(device_id) {};

/**
 * Gets called when a device has left the game.
 * @abstract
 * @param {number} device_id - the device ID that left the game.
 */
AirConsole.prototype.onDisconnect = function(device_id) {};

/**
 * Returns the device_id of this device.
 * Every device in an AirConsole session has a device_id.
 * The screen always has device_id 0. You can use the AirConsole.SCREEN
 * constant instead of 0.
 * All controllers also get a device_id. You can NOT assume that the device_ids
 * of controllers are consecutive or that they start at 1.
 *
 * DO NOT HARDCODE CONTROLLER DEVICE IDS!
 *
 * If you want to have a logic with "players numbers" (Player 0, Player 1,
 * Player 2, Player 3) use the setActivePlayers helper function! You can
 * hardcode player numbers, but not device_ids.
 *
 * Within an AirConsole session, devices keep the same device_id when they
 * disconnect and reconnect. Different controllers will never get the same
 * device_id in a session. Every device_id remains reserved for the device that
 * originally got it.
 *
 * @see http:// developers.airconsole.com/#/guides/device_ids_and_states
 *
 * @return {number}
 */
AirConsole.prototype.getDeviceId = function() {
  return this.device_id;
};

/**
 * Returns the device ID of the master controller.
 * Premium devices are prioritzed.
 * @return {number|undefined}
 */
AirConsole.prototype.getMasterControllerDeviceId = function() {
  var premium_device_ids = this.getPremiumDeviceIds();
  if (premium_device_ids.length) {
    return premium_device_ids[0];
  }
  return this.getControllerDeviceIds()[0];
};

/**
 * Returns all controller device ids that have loaded your game.
 * @return {Array}
 */
AirConsole.prototype.getControllerDeviceIds = function() {
  var result = [];
  var game_url = this.getGameUrl_(this.getLocationUrl_());
  for (var i = AirConsole.SCREEN + 1; i < this.devices.length; ++i) {
    if (this.devices[i] &&
      this.getGameUrl_(this.devices[i].location) == game_url) {
      result.push(i);
    }
  }
  return result;
};

/**
 * Returns the current time of the game server.
 * This allows you to have a synchronized clock: You can send the server
 * time in a message to know exactly at what point something happened on a
 * device. This function can only be called if the AirConsole was instantiated
 * with the "synchronize_time" opts set to true and after onReady was called.
 * @return {number} Timestamp in milliseconds.
 */
AirConsole.prototype.getServerTime = function() {
  if (this.server_time_offset === false) {
    throw "AirConsole constructor was not called with " +
    "{synchronize_time: true}";
  }
  return new Date().getTime() + this.server_time_offset;
};

/**
 * Queries, if new devices are currently silenced.
 * @returns {boolean} True, if new devices that are not players are silenced.
 * @since 1.9.0
 */
AirConsole.prototype.arePlayersSilenced = function () {
  if(this.devices[AirConsole.SCREEN] === undefined) {
    return false;
  }

  var playersSilenced = this.devices[AirConsole.SCREEN].hasOwnProperty("silencePlayers") ? this.devices[AirConsole.SCREEN]["silencePlayers"] : false;
  return (!!this.silence_inactive_players || playersSilenced)
    && (this.devices[AirConsole.SCREEN]["players"] !== undefined && this.devices[AirConsole.SCREEN]["players"].length > 0);
}

/**
 * Dictionary of silenced update messages queued during a running game session.
 * @private
 * @since 1.9.0
 */
AirConsole.prototype.silencedUpdatesQueue_ = {};

/** ------------------------------------------------------------------------ *
 * @chapter                     MESSAGING                                    *
 * @see         http://developers.airconsole.com/#!/guides/pong              *
 * ------------------------------------------------------------------------- */

/**
 * Sends a message to another device.
 * @param device_id {number|undefined} - The device ID to send the message to.
 *                                       If "device_id" is undefined, the
 *                                       message is sent to all devices (except
 *                                       this one).
 * @param data
 */
AirConsole.prototype.message = function (device_id, data) {
  if (this.device_id !== undefined && !this.deviceIsSilenced_(device_id)) {
    AirConsole.postMessage_({ action: "message", to: device_id, data: data });
  }
}

/**
 * Sends a message to all connected devices.
 * @param data
 */
AirConsole.prototype.broadcast = function(data) {
  this.message(undefined, data);
};

/**
 * Gets called when a message is received from another device
 * that called message() or broadcast().
 * If you dont want to parse messages yourself and prefer an event driven
 * approach, @see http://github.com/AirConsole/airconsole-events/
 * @abstract
 * @param {number} device_id - The device ID that sent the message.
 * @param {serializable} data - The data that was sent.
 */
AirConsole.prototype.onMessage = function(device_id, data) {};


/** ------------------------------------------------------------------------ *
 * @chapter                    DEVICE STATES                                 *
 * @see   http://developers.airconsole.com/#!/guides/device_ids_and_states   *
 * ------------------------------------------------------------------------- */

/**
 * Gets the custom DeviceState of a device.
 * @param {number|undefined} device_id - The device ID of which you want the
 *                                       custom state. Default is this device.
 * @return {Object|undefined} The custom data previously set by the device.
 */
AirConsole.prototype.getCustomDeviceState = function(device_id) {
  if (device_id === undefined) {
    device_id = this.device_id;
  }
  var device_data = this.devices[device_id];
  if (device_data && this.getGameUrl_(this.getLocationUrl_()) ==
    this.getGameUrl_(device_data.location)) {
    return device_data["custom"];
  }
};

/**
 * Sets the custom DeviceState of this device.
 * @param {Object} data - The custom data to set.
 */
AirConsole.prototype.setCustomDeviceState = function(data) {
  if (this.device_id !== undefined) {
    this.devices[this.device_id]["custom"] = data;
    this.set_("custom", data);
  }
};

/**
 * Sets a property in the custom DeviceState of this device.
 * @param {String} key - The property name.
 * @param {mixed} value - The property value.
 */
AirConsole.prototype.setCustomDeviceStateProperty = function(key, value) {
  if (this.device_id !== undefined) {
    var state = this.getCustomDeviceState();
    if (state === undefined) {
      state = {};
    } else if (typeof state !== "object") {
      throw "Custom DeviceState needs to be of type object";
    }
    state[key] = value;
    this.setCustomDeviceState(state);
  }
};

/**
 * @typedef {Object} ImmersiveClimateOption
 * @property {number} fanSpeed - Speed of the fans. Format: integer between 0 and 100.
 */

/**
 * @typedef {Object} ImmersiveLightOption
 * @property {number} r - The red value of the light. Format: integer between 0 and 255.
 * @property {number} g - The green value of the light. Format: integer between 0 and 255.
 * @property {number} b - The blue value of the light. Format: integer between 0 and 255.
 */

/**
 * @typedef {Object} ImmersiveOption
 * @property {ImmersiveLightOption} [light] - Light state inside the car.
 * @property {ImmersiveClimateOption} [climate] - Climate state inside the car.
 * @property {any} [experiment] - Experimental payload for experimental APIs
 * */

/**
 * Sets the immersive state of the AirConsole game based on the provided options.<br />
 * At least one property is required for the immersive state to be set.
 *
 * @param {ImmersiveOption} immersiveState - The immersive state to send.
 */
AirConsole.prototype.setImmersiveState = function (immersiveState) {
  if (this.device_id !== AirConsole.SCREEN) {
    throw 'Only the screen can set the immersive state.';
  }

  if (immersiveState === undefined || typeof immersiveState !== 'object' || Object.keys(immersiveState).length === 0) {
    return;
  }

  if (immersiveState.light === undefined && immersiveState.climate === undefined && immersiveState.experiment === undefined) {
    return;
  }

  this.set_('immersive', immersiveState);
};


/**
 * Gets called when a device updates it's custom DeviceState
 * by calling setCustomDeviceState or setCustomDeviceStateProperty.
 * Make sure you understand the power of device states:
 * @see http://developers.airconsole.com/#/guides/device_ids_and_states
 * @abstract
 * @param {number} device_id - the device ID that changed its custom
 *                             DeviceState.
 * @param {Object} custom_data - The custom DeviceState data value
 */
AirConsole.prototype.onCustomDeviceStateChange = function(device_id,
                                                          custom_data) {};
/**
 * Gets called when a device joins/leaves a game session or updates its
 * DeviceState (custom DeviceState, profile pic, nickname, internal state).
 * This is function is also called every time onConnect, onDisconnect or
 * onCustomDeviceStateChange, onDeviceProfileChange is called.
 * It's like their root function.
 * @abstract
 * @param {number} device_id - the device_id that changed its DeviceState.
 * @param user_data {AirConsole~DeviceState} - the data of that device.
 *        If undefined, the device has left.
 */
AirConsole.prototype.onDeviceStateChange = function(device_id, device_data) {};


/** ------------------------------------------------------------------------ *
 * @chapter                       PROFILE                                    *
 * ------------------------------------------------------------------------- */

/**
 * Returns the globally unique id of a device.
 * @param {number|undefined} device_id - The device id for which you want the
 *                                       uid. Default is this device.
 * @return {string|undefined}
 */
AirConsole.prototype.getUID = function(device_id) {
  if (device_id === undefined) {
    device_id = this.device_id;
  }
  var device_data = this.devices[device_id];
  if (device_data) {
    return device_data.uid;
  }
};

/**
 * Returns the nickname of a user.
 * @param {number|undefined} device_id - The device id for which you want the
 *                                       nickname. Default is this device.
 *                                       Screens don't have nicknames.
 * @return {string|undefined}
 */
AirConsole.prototype.getNickname = function(device_id) {
  if (device_id === undefined) {
    device_id = this.device_id;
  }
  var device_data = this.devices[device_id];
  if (device_data) {
    return device_data.nickname || ("Guest " + device_id);
  }
};

/**
 * Returns the url to a profile picture of the user.
 * @param {number|string|undefined} device_id_or_uid - The device id or uid for
 *                                                     which you want the
 *                                                     profile picture.
 *                                                     Default is the current
 *                                                     user.
 *                                                     Screens don't have
 *                                                     profile pictures.
 * @param {number|undefined} size - The size of in pixels of the picture.
 *                                  Default is 64.
 * @return {string|undefined}
 */
AirConsole.prototype.getProfilePicture = function(device_id_or_uid, size) {
  if (device_id_or_uid === undefined) {
    device_id_or_uid = this.device_id;
  } else if (typeof device_id_or_uid == "string") {
    return "https://www.airconsole.com/api/profile-picture?uid=" +
      device_id_or_uid + "&size=" + (size||64);
  }
  var device_data = this.devices[device_id_or_uid];
  if (device_data) {
    var url = "https://www.airconsole.com/api/profile-picture?uid=" +
      device_data.uid + "&size=" + (size||64);
    if (device_data.picture) {
      url += "&v=" + device_data.picture;
    }
    return url;
  }
};

/**
 * Gets called when a device updates it's profile pic, nickname or email.
 * @abstract
 * @param {number} device_id - The device_id that changed its profile.
 */
AirConsole.prototype.onDeviceProfileChange = function(device_id) {};

/**
 * Returns true if a user is logged in.
 * @param {number|undefined} device_id - The device_id of the user.
 *                                       Default is this device.
 * @returns {boolean}
 */
AirConsole.prototype.isUserLoggedIn = function(device_id) {
  if (device_id == undefined) {
    device_id = this.device_id;
  }
  var data = this.devices[device_id];
  if (data) {
    return data.auth;
  }
};

/**
 * Requests the email address of this device and calls onEmailAddress iff the
 * request was granted. For privacy reasons, you need to whitelist your
 * game in order to receive the email address of the user. To whitelist your
 * game, contact developers@airconsole.com. For development purposes, localhost
 * is always allowed.
 */
AirConsole.prototype.requestEmailAddress = function() {
  this.set_("email", true);
};

/**
 * Gets called if the request of requestEmailAddress() was granted.
 * For privacy reasons, you need to whitelist your game in order to receive
 * the email address of the user. To whitelist your game, contact
 * developers@airconsole.com. For development purposes, localhost is always
 * allowed.
 * @abstract
 * @param {string|undefined} email_address - The email address of the user if
 *        it was set.
 */
AirConsole.prototype.onEmailAddress = function(email_address) {};

/**
 * Lets the user change his nickname, profile picture and email address.
 * If you need a real nickname of the user, use this function.
 * onDeviceProfileChange will be called if the user logs in.
 */
AirConsole.prototype.editProfile = function() {
  this.set_("login", true);
};


/** ------------------------------------------------------------------------ *
 * @chapter                   ACTIVE PLAYERS                                 *
 * @see   http://developers.airconsole.com/#!/guides/device_ids_and_states   *
 * ------------------------------------------------------------------------- */

/**
 * Takes all currently connected controllers and assigns them a player number.<br />
 * Can only be called by the screen. You don't have to use this helper
 * function, but this mechanism is very convenient if you want to know which
 * device is the first player, the second player, the third player ...<br />
 * The assigned player numbers always start with 0 and are consecutive.
 * You can hardcode player numbers, but not device_ids.<br />
 * Once the screen has called setActivePlayers you can get the device_id of
 * the first player by calling convertPlayerNumberToDeviceId(0), the device_id
 * of the second player by calling convertPlayerNumberToDeviceId(1), ...<br />
 * You can also convert device_ids to player numbers by calling
 * convertDeviceIdToPlayerNumber(device_id). You can get all device_ids that
 * are active players by calling getActivePlayerDeviceIds().<br />
 * The screen can call this function every time a game round starts.<br />
 * When using {@link https://developers.airconsole.com/#!/guides/player_silencing Player Silencing}, the screen needs to call this every time a game round starts or finishes.<br />
 *  Calling it with max_players of 1 or more signals the start of the game round while calling it with max_players 0 signals the end of the game round.
 * @param {number} max_players - The maximum number of controllers that should
 *                               get a player number assigned.
 */
AirConsole.prototype.setActivePlayers = function(max_players) {
  if (this.getDeviceId() !== AirConsole.SCREEN) {
    throw "Only the AirConsole.SCREEN can set the active players!";
  }
  this.device_id_to_player_cache = undefined;
  var players = this.getControllerDeviceIds();
  if (max_players !== undefined) {
    players = players.slice(0, Math.min(players.length, max_players));
  }
  this.devices[AirConsole.SCREEN]["players"] = players;
  this.set_("players", players);

  if (max_players === 0) {
    for (var key in this.silencedUpdatesQueue_) {
      if (this.silencedUpdatesQueue_.hasOwnProperty(key)) {
        var events = this.silencedUpdatesQueue_[key];
        for (var i = 0; i < events.length; i++) {
          this.onPostMessage_(events[i]);
        }
      }
    }
    this.silencedUpdatesQueue_ = {};
  }
};

/**
 * Gets called when the screen sets the active players by calling
 * setActivePlayers().
 * @abstract
 * @param {number|undefined} player_number - The player number of this device.
 *                                           Can be undefined if this device
 *                                           is not part of the active players.
 */
AirConsole.prototype.onActivePlayersChange = function(player_number) {};

/**
 * Returns an array of device_ids of the active players previously set by the
 * screen by calling setActivePlayers. The first device_id in the array is the
 * first player, the second device_id in the array is the second player, ...
 * @returns {Array}
 */
AirConsole.prototype.getActivePlayerDeviceIds = function() {
  return this.devices[AirConsole.SCREEN]["players"] || [];
};

/**
 * Returns the device_id of a player, if the player is part of the active
 * players previously set by the screen by calling setActivePlayers. If fewer
 * players are in the game than the passed in player_number or the active
 * players have not been set by the screen, this function returns undefined.
 * @param player_number
 * @returns {number|undefined}
 */
AirConsole.prototype.convertPlayerNumberToDeviceId = function(player_number) {
  return this.getActivePlayerDeviceIds()[player_number];
};

/**
 * Returns the player number for a device_id, if the device_id is part of the
 * active players previously set by the screen by calling setActivePlayers.
 * Player numbers are zero based and are consecutive. If the device_id is not
 * part of the active players, this function returns undefined.
 * @param device_id
 * @returns {number|undefined}
 */
AirConsole.prototype.convertDeviceIdToPlayerNumber = function(device_id) {
  if (!this.devices[AirConsole.SCREEN] ||
    !this.devices[AirConsole.SCREEN]["players"]) {
    return;
  }
  if (!this.device_id_to_player_cache) {
    this.device_id_to_player_cache = {};
    var players = this.devices[AirConsole.SCREEN]["players"];
    for (var i = 0; i < players.length; ++i) {
      this.device_id_to_player_cache[players[i]] = i;
    }
  }
  return this.device_id_to_player_cache[device_id];
};


/** ------------------------------------------------------------------------ *
 * @chapter                 CONTROLLER INPUTS                                *
 * ------------------------------------------------------------------------- */

/**
 * Gets called every X milliseconds with device motion data iff the
 * AirConsole was instantiated with the "device_motion" opts set to the
 * interval in milliseconds. Only works for controllers.
 * Note: Some browsers do not allow games to access accelerometer and gyroscope
 *       in an iframe (your game). So use this method if you need gyroscope
 *       or accelerometer data.
 * @abstract
 * @param {object} data - data.x, data.y, data.z for accelerometer
 *                        data.alpha, data.beta, data.gamma for gyroscope
 */
AirConsole.prototype.onDeviceMotion = function(data) {};

/**
 * Vibrates the device for a specific amount of time. Only works for controllers.
 * Note: iOS ignores the specified time and vibrates for a pre-set amount of time.
 * @param {Number} time - Milliseconds to vibrate the device
 */
AirConsole.prototype.vibrate = function(time) {
  this.set_("vibrate", time);
};

/** ------------------------------------------------------------------------ *
 * @chapter                          ADS                                     *
 * ------------------------------------------------------------------------- */

/**
 * Requests that AirConsole shows a multiscreen advertisment.
 * Can only be called by the AirConsole.SCREEN.
 * onAdShow is called on all connected devices if an advertisement
 * is shown (in this event please mute all sounds).
 * onAdComplete is called on all connected devices when the
 * advertisement is complete or no advertisement was shown.
 */
AirConsole.prototype.showAd = function() {
  if (this.device_id != AirConsole.SCREEN) {
    throw "Only the AirConsole.SCREEN can call showAd!";
  }
  this.set_("ad", true);
};

/**
 * Gets called if a fullscreen advertisement is shown on this screen.
 * In case this event gets called, please mute all sounds.
 * @abstract
 */
AirConsole.prototype.onAdShow = function() {};

/**
 * Gets called when an advertisement is finished or no advertisement was shown.
 * @abstract
 * @param {boolean} ad_was_shown - True iff an ad was shown and onAdShow was
 *                                 called.
 */
AirConsole.prototype.onAdComplete = function(ad_was_shown) {};


/** ------------------------------------------------------------------------ *
 * @chapter                       PREMIUM                                    *
 * ------------------------------------------------------------------------- */

/**
 * Returns true if the device is premium
 * @param {number} device_id - The device_id that should be checked.
 *                             Only controllers can be premium.
 *                             Default is this device.
 * @return {boolean|undefined} Returns true or false for a valid device_id and
 *                             undefined if the device_id is not valid.
 *
 */
AirConsole.prototype.isPremium = function(device_id) {
  if (device_id === undefined) {
    device_id = this.device_id;
  }
  var device_data = this.devices[device_id];
  if (device_data && device_id != AirConsole.SCREEN) {
    return !!device_data.premium;
  }
};

/**
 * Returns all device ids that are premium.
 * @return {Array<number>}
 */
AirConsole.prototype.getPremiumDeviceIds = function() {
  var premium = [];
  for (var i = 1; i < this.devices.length; ++i) {
    if (this.isPremium(i)) {
      premium.push(i);
    }
  }
  return premium;
};

/**
 * Offers the user to become a premium member.
 * Can only be called from controllers.
 * If you call getPremium in development mode, the device becomes premium
 * immediately.
 */
AirConsole.prototype.getPremium = function() {
  this.set_("premium", true);
};

/**
 * Gets called when a device becomes premium or when a premium device connects.
 * @abstract
 * @param {number} device_id - The device id of the premium device.
 */
AirConsole.prototype.onPremium = function(device_id) {};


/** ------------------------------------------------------------------------ *
 * @chapter                       NAVIGATION                                 *
 * ------------------------------------------------------------------------- */

/**
 * Request that all devices return to the AirConsole store.
 */
AirConsole.prototype.navigateHome = function() {
  this.set_("home", true);
};

/**
 * Request that all devices load a game by url or game id.
 * @param {string} url - The base url of the game to navigate to
 *                       (excluding screen.html or controller.html).
 *                       Instead of a url you may also pass a game id.
 *                       You can also navigate relatively to your current
 *                       game directory: To navigate to a subdirectory,
 *                       pass "./DIRECTORY_NAME". To navigate to a parent
 *                       directory pass "..".
 * @param {object} parameters - You can pass parameters to the game that gets
 *                              loaded. Any jsonizable object is fine.
 *                              The parameters will be appended to the url
 *                              using a url hash.
 */
AirConsole.prototype.navigateTo = function(url, parameters) {
  if (url.indexOf(".") == 0) {
    var current_location = this.getLocationUrl_();
    var full_path = current_location.split("#")[0].split("/");
    full_path.pop();
    var relative = url.split("/");
    for (var i = 0; i < relative.length; ++i) {
      if (relative[i] == "..") {
        full_path.pop();
      } else if (relative[i] != "." && relative[i] != "") {
        full_path.push(relative[i]);
      }
    }
    url = full_path.join("/") + "/";
  }
  if (parameters) {
    url += "#" + encodeURIComponent(JSON.stringify(parameters));
  }
  this.set_("home", url);
};

/**
 * Get the parameters in the loaded game that were passed to navigateTo.
 * @returns {*}
 */
AirConsole.prototype.getNavigateParameters = function() {
  if (this.navigate_parameters_cache_) {
    return this.navigate_parameters_cache_;
  }
  if (document.location.hash.length > 1) {
    var result = JSON.parse(decodeURIComponent(
      document.location.hash.substr(1)));
    this.navigate_parameters_cache_ = result;
    return result;
  }
};

/**
 * Opens url in external (default-system) browser. Call this method instead of
 * calling window.open. In-App it will open the system's default browser.
 * Because of Safari iOS you can only use it with the onclick handler:
 * <div onclick="airconsole.openExternalUrl('my-url.com');">Open browser</div>
 * OR in JS with assigning element.onclick.
 * @param {string} url - The url to open
 */
AirConsole.prototype.openExternalUrl = function(url) {
  var data = this.devices[this.device_id];
  if (data.client && data.client.pass_external_url === true) {
    this.set_("pass_external_url", url);
  } else {
    window.open(url);
  }
};


/** ------------------------------------------------------------------------ *
 * @chapter                     USER INTERFACE                               *
 * ------------------------------------------------------------------------- */

/**
 * Sets the device orientation.
 * @param {string} orientation - AirConsole.ORIENTATION_PORTRAIT or
 *                               AirConsole.ORIENTATION_LANDSCAPE.
 */
AirConsole.prototype.setOrientation = function(orientation) {
  this.set_("orientation", orientation);
};


/** ------------------------------------------------------------------------ *
 * @chapter                     PERSISTENT DATA                              *
 * ------------------------------------------------------------------------- */

/**
 * Requests persistent data from the servers.
 * @param {Array<String>} uids - The uids for which you would like to request the persistent data.
 *                                         For controllers, the default is the uid of this device.
 *                                         Screens must provide a valid array of uids.
 * @version 1.9.0 - uids is no longer optional for requests from the screen
 */
AirConsole.prototype.requestPersistentData = function (uids) {
  if (this.device_id === AirConsole.SCREEN) {
    if (!uids) {
      throw new Error("A valid array of uids must be provided on the screen");
    } else if (uids.length < 1) {
      throw new Error("At least one valid uid must be provided on the screen");
    }
  } else {
    uids = uids || [];
    uids.push(this.getUID());
  }
  this.set_("persistentrequest", { uids: uids });
};

/**
 * Gets called when persistent data was loaded from requestPersistentData().
 * @abstract
 * @param {Object} data - An object mapping uids to all key value pairs.
 */
AirConsole.prototype.onPersistentDataLoaded = function(data) {};

/**
 * Stores a key-value pair persistently on the AirConsole servers.
 * Storage is per game. Total storage can not exceed 1 MB per game and uid.
 * Storage is public, not secure and anyone can request and tamper with it.
 * Do not store sensitive data.
 * @param {String} key - The key of the data entry.
 * @param {mixed} value - The value of the data entry.
 * @param {String} uid - The uid for which the data should be stored.
 *                       For controllers, the default is the uid of this device.
 *                       Screens must provide a valid uid.
 * @version 1.9.0 - uid is no longer optional for requests from the screen
 */
AirConsole.prototype.storePersistentData = function (key, value, uid) {
  if (this.device_id === AirConsole.SCREEN) {
    if (!uid) {
      throw new Error("A valid uid must be provided on the screen");
    }
  } else {
    uid = this.getUID();
  }
  this.set_("persistentstore", { key: key, value: value, uid: uid });
};

/**
 * Gets called when persistent data was stored from storePersistentData().
 * @abstract
 * @param {String} uid - The uid for which the data was stored.
 */
AirConsole.prototype.onPersistentDataStored = function(uid) {};


/** ------------------------------------------------------------------------ *
 * @chapter                      HIGH SCORES                                 *
 * @see       http://developers.airconsole.com/#!/guides/highscore           *
 * ------------------------------------------------------------------------- */

/**
 * Stores a high score of the current user on the AirConsole servers.
 * High Scores are public, not secure and anyone can request and tamper with
 * them. Do not store sensitive data. Only updates the high score if it was a
 * higher or same score. Calls onHighScoreStored when the request is done.
 * We highly recommend to read the High Score guide (developers.airconsole.com)
 * @param {String} level_name - The name of the level the user was playing.
 *                              This should be a human readable string because
 *                              it appears in the high score sharing image.
 *                              You can also just pass an empty string.
 * @param {String} level_version - The version of the level the user was
 *                                 playing. This is for your internal use.
 * @param {number} score - The score the user has achieved
 * @param {String|Array<String>|undefined} uid - The UIDs of the users that
 *                                               achieved the high score.
 *                                               Can be a single uid or an
 *                                               array of uids. Default is the
 *                                               uid of this device.
 * @param {mixed|undefined} data - Custom high score data (e.g. can be used to
 *                                 implement Ghost modes or include data to
 *                                 verify that it is not a fake high score).
 * @param {String|undefined} score_string - A short human readable
 *                                          representation of the score.
 *                                          (e.g. "4 points in 3s").
 *                                          Defaults to "X points" where x is
 *                                          the score converted to an integer.
 */
AirConsole.prototype.storeHighScore = function(level_name, level_version,
                                               score, uid, data,
                                               score_string) {
  if (isNaN(score) || typeof score != "number") {
    throw "Score needs to be a number and not NaN!"
  }
  if (!uid) {
    uid = this.getUID();
  }
  if (uid.constructor == Array) {
    uid = uid.join("|");
  }
  this.set_("highscore",
    {
      "uid": uid,
      "level_name": level_name,
      "level_version": level_version,
      "score": score,
      "data": data,
      "score_string": score_string
    });
};

/**
 * Gets called when a high score was successfully stored.
 * We highly recommend to read the High Score guide (developers.airconsole.com)
 * @param {AirConsole~HighScore|null} high_score - The stored high score if
 *                                                 it is a new best for the
 *                                                 user or else null.
 *                                                 Ranks include "world",
 *                                                 "country", "region", "city"
 *                                                 if a high score is passed.
 */
AirConsole.prototype.onHighScoreStored = function(high_score) {};

/**
 * Requests high score data of players (including global high scores and
 * friends). Will call onHighScores when data was received.
 * We highly recommend to read the High Score guide (developers.airconsole.com)
 * @param {String} level_name - The name of the level
 * @param {String} level_version - The version of the level
 * @param {Array<String>|undefined} uids - An array of UIDs of the users that
 *                                         should be included in the result.
 *                                         Default is all connected controllers
 * @param {Array<String>|undefined} ranks - An array of high score rank types.
 *                                          High score rank types can include
 *                                          data from across the world, only a
 *                                          specific area or a users friends.
 *                                          Valid array entries are "world",
 *                                          "country",  "region", "city",
 *                                          "friends", "partner". <br />
 *                                          Default is ["world"].
 * @param {number|undefined} total - Amount of high scores to return per rank
 *                                   type. Default is 8.
 * @param {number|undefined} top - Amount of top high scores to return per rank
 *                                 type. top is part of total. Default is 5.
 */
AirConsole.prototype.requestHighScores = function(level_name, level_version, uids, ranks, total, top) {
  if (!ranks) {
    ranks = ["world"];
  }
  if (!uids) {
    uids = [];
    var device_ids = this.getControllerDeviceIds();
    for (var i = 0; i < device_ids.length; ++i) {
      uids.push(this.getUID(device_ids[i]));
    }
  }
  if (total == undefined) {
    total = 8;
  }
  if (top == undefined) {
    top = 5;
  }
  this.set_("highscores",
    {
      "level_name": level_name,
      "level_version": level_version,
      "uids": uids,
      "ranks": ranks,
      "total": total,
      "top": top
    });
};

/**
 * Gets called when high scores are returned after calling requestHighScores.
 * We highly recommend to read the High Score guide (developers.airconsole.com)
 * @param {Array<AirConsole~HighScore>} high_scores - The high scores.
 */
AirConsole.prototype.onHighScores = function(high_scores) {};

/**
 * DeviceState contains information about a device in this session.
 * Use the helper methods getUID, getNickname, getProfilePicture and
 * getCustomDeviceState to access this data.
 * @typedef {object} AirConsole~DeviceState
 * @property {string} uid - The globally unique ID of the user.
 * @property {string|undefined} custom - Custom device data that this API can set.
 * @property {string|undefined} nickname - The nickname of the user.
 * @property {boolean|undefined} slow_connection - If the user has a high server latency.
 * @property {AirConsoleScreenEnvironment} environment - The games multiplayer environment to let multiple games in the
 *                                                       same location play together. Only present for the screen device.
 */

/**
 * HighScore contains information about a users high score
 * We highly recommend to read the High Score guide (developers.airconsole.com)
 * @typedef {object} AirConsole~HighScore
 * @property {String} level_name - The name of the level the user was playing
 * @property {String} level_version - The version of the level the user was
 *                                    playing
 * @property {number} score - The score the user has achieved
 * @property {String} score_string - A human readable version of score.
 * @property {Object} ranks - A dictionary of rank type to actual rank.
 * @property {mixed} data - Custom High Score data. Can be used to implement
 *                          Ghost modes or to verify that it is not a fake
 *                          high score.
 * @property {String} uids - The unique ID of the users that achieved the
 *                           high score.
 * @property {number} timestamp - The timestamp of the high score
 * @property {String} nicknames - The nicknames of the users
 * @property {String} relationship - How the user relates to the current user
 *                                 - "requested" (a user which was requested)
 *                                 - "airconsole" (played AirConsole together)
 *                                 - "facebook" (a facebook friend)
 *                                 - "other" (about same skill level)
 * @property {String} location_country_code - The iso3166 country code
 * @property {String} location_country_name - The name of the country
 * @property {String} location_region_code - The iso3166 region code
 * @property {String} location_region_name - The name of the region
 * @property {String} location_city_name - The name of the city
 * @property {String} share_url - The URL that should be used to share this
 *                                high score.
 * @property {String} share_image - The URL to an image that displays this
 *                                  high score.
 */

/** ------------------------------------------------------------------------ *
 * @chapter                     TRANSLATIONS                                 *
 * @see       http://developers.airconsole.com/#!/guides/translations        *
 * ------------------------------------------------------------------------- */

/**
 * Gets a translation for the users current language
 * See http://developers.airconsole.com/#!/guides/translations
 * @param {String} id - The id of the translation string.
 * @param {Object|undefined} values - Values that should be used for
 *                                    replacement in the translated string.
 *                                    E.g. if a translated string is
 *                                    "Hi %name%" and values is {"name": "Tom"}
 *                                    then this will be replaced to "Hi Tom".
 */
AirConsole.prototype.getTranslation = function(id, values) {
  if (this.translations) {
    if (this.translations[id]) {
      var result = this.translations[id];
      if (values && result) {
        var parts = result.split("%");
        for (var i = 1; i < parts.length; i += 2) {
          if (parts[i].length) {
            parts[i] = values[parts[i]] || "";
          } else {
            parts[i] = "%";
          }
        }
        result = parts.join("");
      }
      return result;
    }
  }
};

/**
 * Returns the current IETF language tag of a device e.g. "en" or "en-US"
 * @param {number|undefined} device_id - The device id for which you want the
 *                                       language. Default is this device.
 * @return {String} IETF language
 */
AirConsole.prototype.getLanguage = function(device_id) {
  if (device_id === undefined) {
    device_id = this.device_id;
  }
  var device_data = this.devices[device_id];
  if (device_data) {
    return device_data.language;
  }
};

/** ------------------------------------------------------------------------ *
 * @chapter              ENVIRONMENT EVENTS                                  *
 * ------------------------------------------------------------------------- */

/**
 * Gets called on the Screen when the game should be paused.
 * @abstract
 */
AirConsole.prototype.onPause = function() {};

/**
 * Gets called on the Screen when the game should be resumed.
 * @abstract
 */
AirConsole.prototype.onResume = function() {};

/** ------------------------------------------------------------------------ *
 *                   ONLY PRIVATE FUNCTIONS BELLOW                           *
 * ------------------------------------------------------------------------- */

/**
 * Determines if AirConsole by default should have player silencing enabled or not.
 * @returns If the player should be silenced based on environment factors.
 * @private
 */
AirConsole.prototype.getDefaultPlayerSilencing_ = function() {
  const referencedAirconsoleAPIScripts = Array.prototype.slice.call(document.getElementsByTagName('script'),0)
  .map(it => it.src).filter(it => it.includes('api/airconsole-'));
  if(referencedAirconsoleAPIScripts.length > 1) {
    alert('only a single instance of api/airconsole-*.js must be used per screen/controller.')
    return;
  }
  let airconsoleApiVersion = ['', this.version];
  if(referencedAirconsoleAPIScripts.length > 0) {
    airconsoleApiVersion = referencedAirconsoleAPIScripts[0]
      .match(new RegExp('https?://.*/api/airconsole-(.*).js'));
  }

  return airconsoleApiVersion.length > 1 && airconsoleApiVersion[1] !== 'latest' || false;
}

/**
 * Initializes the AirConsole.
 * @param {AirConsole~Config} opts - The Config.
 * @private
 */
AirConsole.prototype.init_ = function(opts) {
  opts = opts || {};
  var me = this;
  me.version = "1.9.0";
  me.devices = [];
  me.silencedUpdatesQueue_ = {};
  me.server_time_offset = opts.synchronize_time ? 0 : false;

  const defaultPlayerSilencing = me.getDefaultPlayerSilencing_();
  me.silence_inactive_players = opts.silence_inactive_players !== undefined ? opts.silence_inactive_players : defaultPlayerSilencing;

  window.addEventListener("message", function(event) {
    me.onPostMessage_(event);
  }, false);
  me.set_("orientation", opts.orientation);
  if (opts.setup_document !== false) {
    me.setupDocument_();
  }
  AirConsole.postMessage_({
    action: "ready",
    version: me.version,
    device_motion: opts.device_motion,
    synchronize_time: opts.synchronize_time,
    silencePlayers: me.silence_inactive_players,
    location: me.getLocationUrl_(),
    translation: opts.translation
  });
};

/**
 * Checks if the location is in the same location of the sender
 * @param {string} location The location to check.
 * @param {string} sender_id The id of the sender.
 * @returns {boolean} True if the location are identical.
 * @private
 */
AirConsole.prototype.isDeviceInSameLocation_ = function (location, sender_id) {
  return !!this.devices[sender_id] && location === this.getGameUrl_(this.devices[sender_id].location);
}

/**
 * Queries if a given device_id is silenced
 * @param {string} device_id  The device_id to be queried.
 * @returns {boolean} True, if the device_id is silenced.
 * @private
 * @since 1.9.0
 */
AirConsole.prototype.deviceIsSilenced_ = function (device_id) {
  return this.arePlayersSilenced() &&
      device_id !== undefined
      && device_id !== AirConsole.SCREEN
      && this.convertDeviceIdToPlayerNumber(device_id) === undefined;
}

/**
 * Handling onMessage events
 * @private
 * @param {Event} event - Event object
 */
AirConsole.prototype.onPostMessage_ = function(event) {
  var me = this;
  var data = event.data;
  var game_url = me.getGameUrl_(me.getLocationUrl_());
  if (data.action === "device_motion") {
    me.onDeviceMotion(data.data);
  } else if (data.action === "message") {
    if (me.device_id !== undefined) {
      if (me.isDeviceInSameLocation_(game_url, data.from) && !me.deviceIsSilenced_(data.from) && !me.deviceIsSilenced_(data.to)) {
        me.onMessage(data.from, data.data);
      }
    }
  } else if (data.action === "update") {
    if (me.device_id !== undefined) {
      var game_url_before = null;
      var game_url_after = null;
      var before = me.devices[data.device_id];
      if (before) {
        game_url_before = me.getGameUrl_(before.location);
      }
      if (data.device_data) {
        game_url_after = me.getGameUrl_(data.device_data.location);
      }
      if (me.deviceIsSilenced_(data.device_id)) {
        var queue = me.silencedUpdatesQueue_[data.device_id] || [];
        if (me.isLocationUnloadedMessage_(game_url_before, game_url, game_url_after)) {
          let connect_removed = false;
          for (let i = 0; i < queue.length; i++) {
            if (queue[i].hasOwnProperty("_is_connect_event")) {
              queue.splice(i);
              connect_removed = true;
              break;
            }
          }

          delete me.silencedUpdatesQueue_[data.device_id];
          if (connect_removed) return;
        }

        if (me.isLocationLoadedMessage_(game_url_before, game_url, game_url_after)) {
          event._is_connect_event = true;
        }

        queue.push(event);
        me.silencedUpdatesQueue_[data.device_id] = queue;
        return;
      }

      var sender = data.device_id;
      me.devices[sender] = data.device_data;
      me.onDeviceStateChange(sender, data.device_data);
      var is_connect = me.isLocationLoadedMessage_(game_url_before, game_url, game_url_after);
      var is_disconnect = me.isLocationUnloadedMessage_(game_url_before, game_url, game_url_after);
      if (is_connect) {
        me.onConnect(sender);
      } else if (is_disconnect) {
        me.onDisconnect(sender);
      }
      if (data.device_data) {
        if ((data.device_data._is_custom_update && game_url_after === game_url)
            || (is_connect && data.device_data.custom)) {
          me.onCustomDeviceStateChange(sender, data.device_data.custom);
        }
        if ((data.device_data._is_players_update && game_url_after === game_url)
            || (data.device_id === AirConsole.SCREEN && data.device_data.players && is_connect)) {
          me.device_id_to_player_cache = null;
          me.onActivePlayersChange(me.convertDeviceIdToPlayerNumber(me.getDeviceId()));
        }
        if (data.device_data.premium && (data.device_data._is_premium_update || is_connect)) {
          me.onPremium(sender);
        }
        if (data.device_data._is_profile_update) {
          me.onDeviceProfileChange(sender);
        }
      }
    }
  } else if (data.action === "ready") {
    me.device_id = data.device_id;
    me.devices = data.devices;
    if (me.server_time_offset !== false) {
      me.server_time_offset = data.server_time_offset || 0;
    }
    if (data.translations) {
      me.translations = data.translations;
      var elements = document.querySelectorAll("[data-translation]");
      for (var i = 0; i < elements.length; ++i) {
        elements[i].innerHTML = me.getTranslation(elements[i].getAttribute(
          "data-translation"));
      }
    }
    var client = me.devices[data.device_id].client;
    me.bindTouchFix_(client);
    me.onReady(data.code);
    for (let i = 0; i < me.devices.length; ++i) {
      if (me.isDeviceInSameLocation_(game_url, i)) {
        if (i !== me.getDeviceId()) {
          me.onConnect(i);
          var custom_state = me.getCustomDeviceState(i);
          if (custom_state !== undefined) {
            me.onCustomDeviceStateChange(i, custom_state);
          }
          if (i === AirConsole.SCREEN && me.devices[i].players) {
            me.device_id_to_player_cache = null;
            me.onActivePlayersChange(me.convertDeviceIdToPlayerNumber(me.getDeviceId()));
          }
        }
        if (me.isPremium(i)) {
          me.onPremium(i);
        }
      }
    }
  } else if (data.action == "profile") {
    if (me.device_id) {
      var state = me.devices[me.device_id];
      state["auth"] = data.auth;
      state["nickname"] = data.nickname;
      state["picture"] = data.picture;
      me.onDeviceStateChange(me.device_id, state);
      me.onDeviceProfileChange(me.device_id);
    }
  } else if (data.action == "email") {
    me.onEmailAddress(data.email);
  } else if (data.action == "ad") {
    if (data.complete == undefined) {
      me.onAdShow();
    } else {
      me.onAdComplete(data.complete);
    }
  } else if (data.action == "highscores") {
    me.onHighScores(data.highscores);
  } else if (data.action == "highscore") {
    me.onHighScoreStored(data.highscore);
  } else if (data.action == "persistentstore") {
    me.onPersistentDataStored(data.uid);
  } else if (data.action == "persistentrequest") {
    me.onPersistentDataLoaded(data.data);
  } else if (data.action == "premium") {
    me.devices[data.device_id].premium = true;
    me.onPremium(data.device_id);
  } else if (data.action == "pause") {
    me.onPause();
  } else if (data.action == "resume") {
    me.onResume();
  } else if (data.action == "debug") {
    if (data.debug == "fps") {
      if (window.requestAnimationFrame) {
        var second_animation_frame = function(start) {
          window.requestAnimationFrame(function(end) {
            if (start != end) {
              var delta = end - start;
              AirConsole.postMessage_({
                "action": "debug",
                "fps": (1000 / delta)
              });
            } else {
              second_animation_frame(start);
            }
          });
        };
        window.requestAnimationFrame(second_animation_frame);
      }
    }
  }
};

/**
 Checks if the urls imply that this is a connect update message
 * @param game_url_before The url before the change of location
 * @param game_url The url of the current location
 * @param game_url_after The url after the change of location
 * @returns {boolean} True, if it is a connect message
 * @private
 */
AirConsole.prototype.isLocationLoadedMessage_ = function (game_url_before, game_url, game_url_after) {
  return (game_url_before !== game_url && game_url_after === game_url);
}

/**
 * Checks if the urls imply that this is a disconnect update message
 * @param game_url_before The url before the change of location
 * @param game_url The url of the current location
 * @param game_url_after The url after the change of location
 * @returns {boolean} True, if it is a disconnect message
 * @private
 */
AirConsole.prototype.isLocationUnloadedMessage_ = function (game_url_before, game_url, game_url_after) {
  return (game_url_before === game_url && game_url_after !== game_url)
}

/**
 * @private
 * @param {String} url - A url.
 * @return {String} Returns the root game url over http.
 */
AirConsole.prototype.getGameUrl_ = function(url) {
  if (!url) {
    return;
  }
  url = url.split("#")[0];
  url = url.split("?")[0];
  if (url.indexOf("screen.html", url.length - 11) !== -1) {
    url = url.substr(0, url.length - 11);
  }
  if (url.indexOf("controller.html", url.length - 15) !== -1) {
    url = url.substr(0, url.length - 15);
  }
  if (url.indexOf("https://") == 0)  {
    url = "http://" + url.substr(8);
  }
  return url;
};

/**
 * Posts a message to the parent window.
 * @private
 * @param {Object} data - the data to be sent to the parent window.
 */
AirConsole.postMessage_ = function(data) {
  try {
    window.parent.postMessage(data, document.referrer);
  } catch(e) {
    console.log("Posting message to parent failed: " + JSON.stringify(data));
  }
};

/**
 * Sets a variable in the external AirConsole framework.
 * @private
 * @param {string} key - The key to set.
 * @param {serializable} value - The value to set.
 */
AirConsole.prototype.set_ = function(key, value) {
  AirConsole.postMessage_({ action: "set", key: key, value: value });
};

/**
 * Adds default css rules to documents so nothing is selectable, zoom is
 * fixed to 1 and preventing scrolling down (iOS 8 clients drop out of
 * fullscreen when scrolling).
 * @private
 */
AirConsole.prototype.setupDocument_ = function() {
  var style = document.createElement("style");
  style.type = "text/css";
  var css_code =
    "html {\n" +
    "  -ms-touch-action: pan-x;\n" +
    "}\n" +
    "body {\n" +
    "  -webkit-touch-callout: none;\n" +
    "  -webkit-text-size-adjust: none;\n" +
    "  -ms-text-size-adjust: none;\n" +
    "  -webkit-user-select: none;\n" +
    "  -moz-user-select: none;\n" +
    "  -ms-user-select: none;\n" +
    "  user-select: none;\n" +
    "  -webkit-highlight: none;\n" +
    "  -webkit-tap-highlight-color: rgba(0,0,0,0);\n" +
    "  -webkit-tap-highlight-color: transparent;\n" +
    "  -ms-touch-action: pan-y;\n" +
    "  -ms-content-zooming: none;\n" +
    "}\n" +
    "\n" +
    "input, textarea  {\n" +
    "  -webkit-user-select: text;\n" +
    "  -moz-user-select: text;\n" +
    "  -ms-user-select: text;\n" +
    "  user-select: text;\n" +
    "}\n" +
    "-ms-@viewport {\n" +
    "    width: device-width;\n" +
    "    initial-scale: 1;\n" +
    "    zoom: 1;\n" +
    "    min-zoom: 1;\n" +
    "    max-zoom: 1;\n" +
    "    user-zoom: fixed;\n" +
    "}";
  if (style.styleSheet) {
    style.styleSheet.cssText = css_code;
  } else {
    style.appendChild(document.createTextNode(css_code));
  }
  var meta = document.createElement("meta");
  meta.setAttribute("name", "viewport");
  meta.setAttribute("content", "width=device-width, minimum-scale=1, " +
    "initial-scale=1, user-scalable=no");
  var head = document.getElementsByTagName("head")[0];
  head.appendChild(meta);
  head.appendChild(style);
  document.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, {passive: false });
  if (navigator.userAgent.indexOf("Windows Phone ") != -1 &&
    navigator.userAgent.indexOf("Edge/") != -1) {
    document.oncontextmenu = document.body.oncontextmenu = function () {
      return false;
    }
  }
};

/**
 * Returns the current location url
 * @return {string}
 * @private
 */
AirConsole.prototype.getLocationUrl_ = function() {
  return document.location.href;
};

/**
 * Fixes delay in touchstart in crosswalk by calling preventDefault.
 * @param {Object} client - The client object
 * @private
 */
AirConsole.prototype.bindTouchFix_ = function(client) {
  // This fix is only necessary for Android Crosswalk
  if (navigator.userAgent.match(/Android/) &&
    client && client.app === "intel-xdk" &&
    client.version <= 2.3) {
    document.addEventListener('touchstart', function(e) {
      var els = ['DIV', 'IMG', 'SPAN', 'BODY', 'TD', 'TH', 'CANVAS', 'P', 'B',
        'CENTER', 'EM', 'FONT', 'H1', 'H2', 'H3', 'H4',
        'H5', 'H6', 'HR', 'I', 'LI', 'PRE', 'SMALL', 'STRONG', 'U'];
      if (els.indexOf(e.target.nodeName) != -1) {
        // Check if one of the parent elements is a link
        var parent = e.target.parentNode;
        while (parent && parent.nodeName != "BODY") {
          if (parent.nodeName == "A") {
            return;
          }
          parent = parent.parentNode;
        }
        e.preventDefault();
        setTimeout(function() {
          e.target.click();
        }, 200);
      }
    });
  }
};

window.addEventListener('error', function(e) {
  var stack = undefined;
  if (e.error && e.error.stack) {
    stack = e.error.stack;
  }
  AirConsole.postMessage_({
    "action": "jserror",
    "url": document.location.href,
    "exception": {
      "message": e.message,
      "error": {
        "stack": stack
      },
      "filename": e.filename,
      "lineno": e.lineno,
      "colno": e.colno
    }
  });
});

window.addEventListener('unhandledrejection', function(e) {
  var stack = undefined;
  if (e.reason && e.reason.stack) {
    stack = e.reason.stack;
  }
  AirConsole.postMessage_({
    "action": "jserror",
    "url": document.location.href,
    "exception": {
      "message": "Unhandled promise rejection: " + e.reason,
      "error": {
        "stack": stack
      },
      "filename": "unhandledrejection:" + e.reason,
      "lineno": 0
    }
  });
});


/**
 * The devices environment. Only available on the screen device.
 * Please visit the {@link https://developers.airconsole.com/#!/guides/multiplayer Multiplayer} guide to see how to use this from onDeviceStateChange or through airconsole.devices[AirConsole.SCREEN].environment.id
 * @typedef {object} AirConsoleScreenEnvironment
 * @property {string} id - Identifier of the environment this screen is in. Where possible this is a specific physical
 *                         location, like a specific car.
 * @property {string} partner - Identifier of the partner in the environment.
 */

/**
 * The AirConsole Screen device data of relevance to game developers.
 * @typedef {object} AirConsoleDevice
 * @property {AirConsoleScreenEnvironment} [environment] - The environment object this device is in. Only present on the screen.
 */

/**
 * The AirConsole Screen device data of relevance to game developers.
 * @typedef {object} AirConsoleObject
 * @property {Array<AirConsoleDevice>} devices - List of devices in this session. Screen is always devices[AirConsole.SCREEN].
 */
;
// Dynamic appends:

window.xmlHttpRequestRetryRanger={CHUNK_SIZE:5*1024*1024,MATCH(e){if(e.indexOf("http://")===0||e.indexOf("https://")===0){let t=document.location.href.split("?")[0].split("#")[0].split("/");t[t.length-1]="",t=t.join("/"),e.indexOf(t)===0&&(e=e.substring(t.length))}return(e.indexOf("Build/")===0||e.indexOf("Release/")===0||e.indexOf("StreamingAssets/")===0)&&!e.endsWith(".json")},ACTIVE(){if(typeof onGameReady=="function"&&typeof Unity>"u"&&(document.location.hostname==="game-delivery.airconsole.com"||document.location.hostname==="game-static.airconsole.com"||document.location.hostname==="alt-cdn-game-static.airconsole.com"||document.location.hostname==="game.airconsole.com")&&document.location.pathname.endsWith("screen.html")){const t=["Chrome","Firefox","Edge"];if(navigator.userAgent){for(let i=0;i<t.length;i+=1)if(navigator.userAgent.indexOf(`${t[i]}/`)!==-1)return!0}}return!1},USE_PSEUDO_RANGE_HEADERS:!0,URL_REWRITE(e,t,i){const a=e.split("#");let n=a[0],o;a[1]!==void 0&&(a.shift(),o=a.join("#"));let s,c=!1;return window&&window.location&&(window.location.hostname==="game-static.airconsole.com"||window.location.hostname==="alt-cdn-game-static.airconsole.com")&&(c=!0),c?(n+=`.CHUNK.${t}`,s=n,o!==void 0&&(s+=`#${o}`)):(n.indexOf("?")===-1?n+="?":n+="&",n+=`xmlhttprequest-ranger-start=${t}&xmlhttprequest-ranger-end=${i}`,s=n,o!==void 0&&(s+=`#${o}`)),s},originalXMLHttpRequest:window.XMLHttpRequest};

;
(()=>{if(window.xmlHttpRequestRetryRanger&&window.fetch&&window.ReadableStream){const d=fetch;window.fetch=function(n,y){if(window.xmlHttpRequestRetryRanger.ACTIVE()&&typeof n=="string"&&window.xmlHttpRequestRetryRanger.MATCH(n))try{let s;const f=new ReadableStream({start(o){s=o},type:"bytes"});return new Promise((o,w)=>{let a=!1,i=0;const t=new XMLHttpRequest;t.responseType="arraybuffer";function c(){try{if(t.readyState>=2&&t.status===200){if(!a){a=!0;const r={status:200,statusText:"",headers:{"Content-Length":t.getResponseHeader("Content-Length")}};(n.endsWith(".wasm")||n.endsWith(".wasm.gz"))&&(r.headers["Content-Type"]="application/wasm"),o(new Response(f,r))}let e=t.response;if(e&&(ArrayBuffer.isView(e)===!1&&(e=new Uint8Array(e)),e=e.slice(i,t.response.byteLength),e.byteLength)){const r=e.byteLength;r&&(s.enqueue(e),i+=r)}if(t.readyState===4)try{s.close()}catch(r){}}}catch(e){throw console.error("Unity Fetch proxy failed",e),e}}t.onreadystatechange=c,t.onprogress=c,t.addEventListener("error",e=>{w(e)}),t.open("GET",n,!0),t.send()})}catch(s){console.warn("Unity Fetch: ReadableStream or Promise could not be created.")}return d(n,y)}}})();

;
(()=>{if(!window.Proxy)return;const R={CHUNK_SIZE:5*1024*1024,MATCH(){return!0},ACTIVE(){const e=["Chrome","Safari","Firefox","Edge"];if(navigator.userAgent){for(let n=0;n<e.length;n+=1)if(navigator.userAgent.indexOf(`${e[n]}/`)!==-1)return!0}return!1},MAX_INITIAL_RETRIES:10,INITIAL_RETRY_DELAY_MS:1e3,MAX_EXTENDED_RETRIES:1200,EXTENDED_RETRY_DELAY_MS:3e3,URL_REWRITE(e,n,r,t){return e},USE_PSEUDO_RANGE_HEADERS:!1,PROCESS_READY_STATE_4_PROXY:D},y={loadstart:!0,progress:!0,load:!0,loadend:!0,error:!1,timeout:!1,readystatechange:!1},s="_xmlHttpRequestRetryRanger",c=XMLHttpRequest;function T(e,n){return n.status===206||e[s].config.USE_PSEUDO_RANGE_HEADERS&&n.status===200}function a(e,n){return new Proxy(e,{get(r,t){return t==="target"||t==="currentTarget"?n[s].proxy:typeof r[t]=="function"?function(){return r[t].apply(r,arguments)}:r[t]},set(r,t,o){return r[t]=o,!0}})}function C(e,n,r){return new Proxy(a(n,r),{get(t,o){return o==="type"?e:t[o]},set(t,o,u){return t[o]=u,!0}})}function d(e,n,r,t){return new Proxy(a(n,r),{get(o,u){return u==="lengthComputable"?r[s].total>0:u==="total"?r[s].total:u==="loaded"?t?r[s].total:r[s].arrayBufferLength:u==="type"?e:o[u]},set(o,u,i){return o[u]=i,!0}})}function p(e,n){e.on&&e.on(n);for(let r=0;r<e.listeners.length;r+=1)e.listeners[r](n)}function U(e,n){return function(r){p(e[s].listeners[n],r)}}function A(e,n){e.addEventListener(n,U(e,n))}function q(e,n){e[s].readyState=4,e[s].progressComplete||p(e[s].listeners.progress,d("progress",n,e,!0)),p(e[s].listeners.readystatechange,a(n,e)),p(e[s].listeners.load,d("load",n,e,!0)),p(e[s].listeners.loadend,d("loadend",n,e,!0))}function S(e,n,r,t){const o=[];for(let f=0;f<e[s].open_arguments.length;f+=1)f!==1?o.push(e[s].open_arguments[f]):o.push(e[s].config.URL_REWRITE(e[s].open_arguments[f],r,t,e[s].retries));const u=n.open.apply(n,o);let i="range";return e[s].config.USE_PSEUDO_RANGE_HEADERS&&(i="x-retry-ranger-range"),n.setRequestHeader(i,`bytes=${r}-${t}`),u}function w(e,n){e[s].total=n,e[s].response=new Uint8Array(n)}function E(e){const n=new TextDecoder;if(!e[s].response)return"";const r=e[s].response.slice(0,e[s].arrayBufferLength);return n.decode(r)}function I(e){const n=e[s].dataQueue;for(let r=0;r<n.length;r+=1){const t=n[r],o=t[0];if(o===e[s].arrayBufferLength){const u=t[1];e[s].response.set(u,o),e[s].arrayBufferLength+=u.byteLength,e[s].dataQueue.splice(r,1),I(e);return}}}function _(e,n){let r;if(e[s].config.USE_PSEUDO_RANGE_HEADERS?(r=n.getResponseHeader("x-retry-ranger-content-range"),r||(r=n.getResponseHeader("x-goog-meta-x-retry-ranger-content-range"))):r=n.getResponseHeader("content-range"),r){const t=r.match(/^bytes (\d+)-(\d+)\/(\d+)$/);return{start:parseInt(t[1],10),end:parseInt(t[2],10),total:parseInt(t[3],10)}}throw new Error("Response did not contain a valid content-range header")}function D(e,n,r){if(T(e,n)){const o=[_(e,n).start,new Uint8Array(n.response)];e[s].dataQueue.push(o),I(e)}else n.status===200&&(e[s].total=n.response.byteLength,e[s].response=new Uint8Array(n.response),e[s].arrayBufferLength=n.response.byteLength);e[s].total===e[s].arrayBufferLength&&q(e,r)}function H(e,n){e[s].retries=0,n.addEventListener("readystatechange",r=>{if(n.readyState===2)if(e[s].status=n.status,e[s].statusText=n.statusText,e[s].firstRequest=n,T(e,n)){const t=_(e,n);w(e,t.total)}else if(n.status===200){console.warn("xmlhttprequest-retry-ranger: Server did not respond with a partial 206 response.");const t=n.getResponseHeader("Content-Length");t!==null&&(e[s].total=parseInt(t,10))}else w(e,0);e[s].readyState<n.readyState&&n.readyState!==4&&(e[s].readyState=n.readyState,p(e[s].listeners.readystatechange,a(r,e)))})}function L(e,n,r,t,o){e===n&&n.addEventListener("loadstart",u=>{p(e[s].listeners.loadstart,u)}),n.responseType="arraybuffer",n.addEventListener("readystatechange",u=>{if(n.readyState===2&&T(e,n)){const i=_(e,n);if(i.end<e[s].total-1){const f=new c,l=Math.min(i.end+e[s].config.CHUNK_SIZE,e[s].total-1);S(e,f,i.end+1,l),L(e,f,i.end+1,l),f.send()}}n.readyState===4&&n.status!==0&&e[s].config.PROCESS_READY_STATE_4_PROXY(e,n,u,D)}),n.addEventListener("progress",u=>{if(n.status!==0){const i=d("progress",u,e);e[s].progressLast<i.loaded&&(e[s].progressLast=i.loaded,e[s].progressComplete=i.loaded===i.total,p(e[s].listeners.progress,i))}}),n.addEventListener("error",u=>{const{retries:i}=e[s];if(i<e[s].config.MAX_EXTENDED_RETRIES){let f=e[s].config.INITIAL_RETRY_DELAY_MS;i<e[s].config.MAX_INITIAL_RETRIES&&(f=e[s].config.EXTENDED_RETRY_DELAY_MS),window.setTimeout(()=>{const l=new c;o&&H(e,l),e[s].retries+=i+1,S(e,l,r,t),L(e,l,r,t,o),l.send()},f)}else e[s].readyState=4,e[s].status=0,p(e[s].listeners.readystatechange,C("readystatechange",u,e)),p(e[s].listeners.progress,d("progress",u,e)),p(e[s].listeners.error,d("error",u,e)),p(e[s].listeners.loadend,d("loadend",u,e))}),A(e,"timeout")}function N(e,n,r){if(n.indexOf("on")===0&&e[s].listeners[n.substr(2)]!==void 0){const t=e[s].listeners[n.substr(2)];t.on&&delete t.on,r&&(t.on=r)}else if(n==="responseType")if(r===""||r==="text"||r==="json"||r==="arraybuffer")e[s].responseType=r;else throw new Error(`responseType ${r} is not supported`);else e[n]=r;return!0}function P(e,n){const r=!!e[s].open_arguments;if(n==="open")return function(){const t=arguments[1];if(arguments[0].toUpperCase()==="GET"&&arguments[2]!==!1&&e[s].config.MATCH(t,e)){e[s].open_arguments=arguments;const o=e[s].config.CHUNK_SIZE-1;H(e,e,0,o);const u=S(e,e,0,o);return L(e,e,0,o,!0),u}for(const o in y)A(e,o);return e[n].apply(e,arguments)};if(n==="addEventListener")return function(){if(y[arguments[0]]!==void 0)e[s].listeners[arguments[0]].listeners.push(arguments[1]);else return e[n].apply(e,arguments)};if(n==="removeEventListener")return function(){if(y[arguments[0]]!==void 0){const{listeners:t}=e[s].listeners[arguments[0]];for(let o=0;o<t.length;o+=1)t[o]===arguments[1]&&t.splice(o)}else return e[n].apply(e,arguments)};if(n==="responseText"&&r){if(e[s].responseType!=="text"&&e[s].responseType)throw new Error(`responseText not available with response type ${e[s].responseType}`);return e[s].readyState===4?E(e):""}if(n==="response"&&r){if(e[s].readyState===4){if(e[s].responseType==="text"||!e[s].responseType)return E(e);if(e[s].responseType==="json")return JSON.parse(E(e));if(e[s].responseType==="arraybuffer")return e[s].response.buffer}else if(e[s].readyState===2||e[s].readyState===3){if(e[s].responseType==="text"||!e[s].responseType)return E(e);if(e[s].responseType==="arraybuffer")return e[s].response.slice(0,e[s].arrayBufferLength)}return e[s].responseType==="arraybuffer"||e[s].responseType==="json"?null:""}if(n==="responseType")return e[s].responseType||"";if(n==="readyState"&&r)return e[s].readyState||0;if(n==="status"&&r)return e[s].status===206?200:e[s].status||0;if(n==="statusText"&&r)return e[s].statusText==="Partial Content"?"OK":e[s].statusText||"";if(n==="responseURL"&&r){const{firstRequest:t}=e[s];return t?t[n]:""}return n==="abort"||n==="overrideMimeType"?function(){throw new Error(`${n} is not implemented in xmlhttprequest-retry-ranger`)}:n==="getResponseHeader"&&r?function(){const{firstRequest:t}=e[s];return!t||arguments[0]&&arguments[0].toLowerCase()==="content-range"?null:arguments[0]&&arguments[0].toLowerCase()==="content-length"?e[s].total!==void 0?`${e[s].total}`:null:t[n].apply(t,arguments)}:n==="getAllResponseHeaders"&&r?function(){let t="";const{firstRequest:o}=e[s];if(o){const u=o.getAllResponseHeaders().split(`\r
`);for(let i=0;i<u.length;i+=1){const f=u[i].split(":");if(f.length>=2){const l=f[0],b=e[s].proxy.getResponseHeader(l);b!=null&&(t+=`${l}: ${b}\r
`)}}}return t}:n.indexOf("on")===0&&e[s].listeners[n.substr(2)]?e[s].listeners[n.substr(2)].on:typeof e[n]=="function"?function(){return!r&&n==="send"&&(e.responseType=e[s].responseType),e[n].apply(e,arguments)}:e[n]}window.XMLHttpRequest=function(e){const n=new c(e),r=window.xmlHttpRequestRetryRanger||R;if(window.xmlHttpRequestRetryRanger)for(const i in R){const f=window.xmlHttpRequestRetryRanger[i];r[i]=f!==void 0?f:R[i]}if(!r.ACTIVE())return n;const t={set:N,get:P},o=new Proxy(n,t),u={listeners:{},config:r,readyState:0,proxy:o,total:0,arrayBufferLength:0,progressLast:-1,dataQueue:[]};for(const i in y)u.listeners[i]={listeners:[]};return n[s]=u,o};for(const e in c)window.XMLHttpRequest[e]=c[e]})();

;
(function(){let m,u;class g{constructor(){this.timeToInteraction=0,this.fps=0,this.lastPaint=performance.now(),this.longestNoPaint=0,this.startTime=performance.now();const e=()=>({initialDownload:{transferSize:0,cacheSize:0,duration:0,completed:!1},totalDownload:{transferSize:0,cacheSize:0,duration:0},fps:0,events:{messagesSent:0,messagesReceived:0,totalSent:0,totalReceived:0},adEvents:{showRequested:0,showSuccess:0},timing:{responseEnded:0,domCompleted:0,loadingEnded:0}});this.sentMeasurements=e(),this.measurements=e(),u&&this.removeUnityIndexedDBCache(),this.patchRequestAnimationFrame()}init(){this.patchRequestAnimationFrame(),this.patchAirConsolePostMessage(),this.listenForAirConsoleMessages(),this.finishInitialDownloadCollection(),this.enableContinuousPerformanceReporting()}removeUnityIndexedDBCache(){const e=["/idbfs","/idbfs-test","UnityCache"];e.forEach(t=>this.constructor.removeIndexedDatabase(e,t))}static removeIndexedDatabase(e,t){if(!e.includes(t))return;const n=window.indexedDB.open(t);n.onsuccess=()=>{n.result.close(),console.debug("AirConsole successfully closed Unity DataCache ",t);const s=window.indexedDB.deleteDatabase(t);s.onerror=()=>{console.debug("AirConsole failed to delete Unity indexedDB cache ",t)},s.onsuccess=()=>{console.debug("AirConsole successfully deleted Unity indexedDB cache ",t)}},n.onerror=s=>{console.debug("AirConsole failed to delete Unity indexedDB cache ",t," with ",s)}}patchAirConsolePostMessage(){let e;try{e=AirConsole.postMessage_}catch(t){console.warn(t)}if(e!==void 0){const t=this;AirConsole.postMessage_=n=>{n.action!=="performance_data"&&t.incrementMeasurement("events","totalSent",1),n.action==="message"&&t.incrementMeasurement("events","messagesSent",1),n.action==="set"&&n.key==="ad"&&n.value===!0&&this.reportAdShowRequest(),e(n)}}}listenForAirConsoleMessages(){window.addEventListener("message",e=>{const{data:t}=e;t.action!==void 0&&t.action!=="performance_data"&&this.incrementMeasurement("events","totalReceived",1),t.action==="message"&&this.incrementMeasurement("events","messagesReceived",1)},!1)}enableContinuousPerformanceReporting(){setInterval(()=>{this.sendPerformanceEvent()},1e3)}patchRequestAnimationFrame(){const e=window.requestAnimationFrame,t=this;e&&(window.requestAnimationFrame=function(...s){t.fps+=1,t.longestNoPaint=Math.max(t.longestNoPaint||0,performance.now()-t.lastPaint),t.lastPaint=performance.now(),e.apply(this,s)})}collectDownloadSize(){let e=0,t=0,n=0;const s=new Set,o=performance.getEntriesByType("resource");for(let a=0;a<o.length;a+=1){const i=o[a];if(i.initiatorType==="fetch"||i.initiatorType==="xmlhttprequest"||i.initiatorType==="css"){if(s.has(i.name))return this.measurements.initialDownload.completed?this.measurements.initialDownload:this.measurements.totalDownload;s.add(i.name),e+=i.transferSize>0?i.transferSize:i.encodedBodySize,t+=i.decodedBodySize,n+=i.duration}}return{cacheSize:t,transferSize:e,duration:n}}updateDownload(){const e=this.collectDownloadSize(),t=this.measurements.initialDownload.completed?"totalDownload":"initialDownload";this.measurements[t]={...this.measurements[t],...e}}updateTiming(){const e=performance.getEntriesByType("navigation");this.timeToInteraction===0&&this.measurements.events.totalSent+this.measurements.events.totalReceived>=1&&(this.timeToInteraction=performance.now()-this.startTime),this.measurements.timing={duration:e[0].duration,timeToInteraction:this.timeToInteraction}}updateFps(){this.measurements.fps=this.fps,this.fps=0}reportAdShowRequest(){this.measurements.adEvents.showRequested+=1}reportAdShowSuccess(){this.measurements.adEvents.showSuccess+=1}updatePerformance(){this.updateDownload(),this.updateTiming(),this.updateFps()}finishInitialDownloadCollection(){this.measurements.initialDownload.completed||(this.updateDownload(),this.measurements.initialDownload.completed=!0)}sendPerformanceEvent(){this.updatePerformance();const e={},{measurements:t}=this;e.fps=t.fps,e.longestNoPaint=this.longestNoPaint,this.hasInitialDownloadSizeChanged()&&(e.initialDownload=t.initialDownload),this.hasTotalDownloadSizeChanged()&&(e.additionalDownload=this.constructor.computeDifference(this.measurements.totalDownload,this.measurements.initialDownload,0)),this.haveEventsChanged()&&(e.events=t.events),this.hasTimingChanged()&&(e.timing=t.timing),this.hasAdEventsChanged()&&(e.adEvents=t.adEvents),this.sentMeasurements=JSON.parse(JSON.stringify(this.measurements)),window.parent.postMessage({action:"performance_data",value:e},"*")}hasInitialDownloadSizeChanged(){return this.areDataObjectsDifferent(this.sentMeasurements.initialDownload,this.measurements.initialDownload)}hasTotalDownloadSizeChanged(){return this.areDataObjectsDifferent(this.sentMeasurements.totalDownload,this.measurements.totalDownload)}haveEventsChanged(){return this.areDataObjectsDifferent(this.sentMeasurements.events,this.measurements.events)}hasTimingChanged(){return this.areDataObjectsDifferent(this.sentMeasurements.timing,this.measurements.timing)}hasAdEventsChanged(){return this.areDataObjectsDifferent(this.sentMeasurements.adEvents,this.measurements.adEvents)}incrementMeasurement(e,t,n){this.measurements[e]&&this.measurements[e][t]&&typeof n=="number"?this.measurements[e][t]+=n:this.measurements[e]&&typeof n=="number"?this.measurements[e][t]=n:console.warn("No measurement [",e,"][",t,"] found.")}areDataObjectsDifferent(e,t){for(let n=0;n<Object.keys(e).length;n+=1){const s=Object.keys(e)[n],o=t[s],a=e[s];if(typeof a=="function"||typeof o=="function")console.debug("Data objects must not contain functions");else if(typeof a=="object"&&a){if(this.areDataObjectsDifferent(a,o))return!0}else if(a!==o)return!0}return!1}static computeDifference(e,t,n){const s={};return Object.keys(t).forEach(o=>{typeof e[o]=="number"&&typeof t[o]=="number"&&(s[o]=Math.max(e[o]-t[o],n))}),s}}function D(){console.debug("AirConsole performance reporting initialized on ",window.location.href),m.init()}const p=function(){return m?(D(),!0):!1},y=new Date().getTime();let c;const f=document.location.pathname.split("/");f.length>=2&&(c=f[1].replace(".cdn.airconsole.com",""),c===f[1]&&(c="com.airconsole.developers"));const d=function(e,t){if(document.location.pathname.indexOf("screen.html")!==document.location.pathname.length-11)return;const n={action:"set",key:e,value:t};try{window.parent.postMessage(n,document.referrer)}catch(s){console.debug(`Posting message to parent failed: ${JSON.stringify(n)}`)}};d("ga",["send","event","GameStartToReady",c,"start",0]),d("download_progress",{start:!0}),window.addEventListener("load",()=>{let l;if(window.performance&&typeof window.performance.getEntriesByType=="function"){const n=function o(a){const i=a.performance.getEntriesByType("resource");let h=0;for(let r=1;r<i.length;r+=1)h+=Math.floor(i[r].encodedBodySize);const w=a.document.getElementsByTagName("iframe");for(let r=1;r<w.length;r+=1)try{h+=o(w[r].contentWindow)}catch(S){}return h};let s;l=window.setInterval(()=>{const o=n(window);o!==s&&(d("download_progress",{downloaded:o}),s=o)},1e3)}const e=function(){l&&window.clearTimeout(l),d("download_progress",{complete:!0});const s=new Date().getTime()-y;d("ga",["send","event","GameStartToReady",c,"ready",2]),d("ga",["send","timing","GameReady",c,s,document.location.hostname])};if(u=typeof onGameReady=="function"&&typeof Unity>"u",u){const n=window.onGameReady;window.onGameReady=function(...o){e(),p(),n.apply(this,o)}}const t=function(s){const{data:o}=s;o.action==="ready"?(s.data.reportPerformance&&(m=new g),u||(e(),p())):o.action==="ad"&&o.complete===void 0&&m&&m.reportAdShowSuccess()};window.addEventListener("message",t)})})();

;
(function(){function i(){return window.app&&window.app.is_unity_ready!==void 0}function o(e){return e?e.app==="mini-idc"&&e.version===23:!1}function a(e){return o(e)}function s(){const e=document.createElement("style");e.type="text/css",e.innerHTML=`
    /*
      #game is used in Unity plugin's template with Unity versions below 2020
      #game-container is used in Unity plugin's template with Unity versions >= 2020
    */
    #game, #game-container {
      left: 0;
      bottom: 0;
      right: 0;
      transform: none;
      margin: auto !important;
    }
  `,document.head.appendChild(e)}function t(e){const{data:n}=e;if(n.action==="ready"&&n.device_id===AirConsole.SCREEN){const r=n.devices[AirConsole.SCREEN];a(r.client)&&s(),window.removeEventListener("message",t)}}document.addEventListener("DOMContentLoaded",()=>{i&&window.addEventListener("message",t)})})();

;
(function(){let n;function s(e){if(e&&e.experiments&&(e.experiments.debug==="all"||e.experiments.debug==="game")){document.title=`${e.nickname} Game`;const t=document.createElement("script");t.setAttribute("src","https://debug.airconsole.com/target.js"),document.head.appendChild(t),window.removeEventListener("message",n)}}n=function(t){const{data:i}=t;i.action==="update"&&i.device_data&&s(i.device_data)},window.addEventListener("message",n)})();

;

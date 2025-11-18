using UnityEngine;
using NDream.AirConsole;
using Newtonsoft.Json.Linq;

namespace KartGame.KartSystems
{
    public class AirConsoleInput : BaseInput
    {
        [Header("AirConsole Settings")]
        [Tooltip("Accept input from ANY controller (recommended for single player)")]
        public bool acceptAnyController = true;
        
        [Tooltip("Player number (only used if acceptAnyController is false)")]
        public int playerNumber = 0;
        
        [Header("Input Smoothing")]
        public bool smoothSteering = true;
        public float steeringSmoothSpeed = 10f;
        
        [Header("Debug")]
        public bool showDebug = true;
        
        private InputData currentInput;
        private float targetTurnInput = 0f;
        private float currentTurnInput = 0f;
        
        void Awake()
        {
            currentInput = new InputData
            {
                Accelerate = false,
                Brake = false,
                TurnInput = 0f
            };
            
            Debug.Log("========================================");
            Debug.Log("🚗 AirConsoleInput.Awake() CALLED");
            Debug.Log("========================================");
        }
        
        void Start()
        {
            Debug.Log("========================================");
            Debug.Log("🚗 AirConsoleInput.Start() CALLED");
            Debug.Log($"🚗 Player Number: {playerNumber}");
            Debug.Log($"🚗 Accept Any Controller: {acceptAnyController}");
            Debug.Log("========================================");
            
            if (AirConsole.instance == null)
            {
                Debug.LogError("❌❌❌ AirConsole.instance is NULL! ❌❌❌");
                Debug.LogError("Make sure you have an AirConsole GameObject in your scene!");
                enabled = false;
                return;
            }
            
            Debug.Log("✅ AirConsole.instance EXISTS");
            
            // Subscribe to messages
            try
            {
                AirConsole.instance.onMessage += OnMessage;
                Debug.Log("✅✅✅ SUBSCRIBED TO onMessage EVENT ✅✅✅");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"❌ Failed to subscribe: {e.Message}");
            }
            
            // Subscribe to ready event
            AirConsole.instance.onReady += OnReady;
            Debug.Log("✅ Subscribed to onReady event");
            
            Debug.Log($"🎮 AirConsoleInput READY for player {playerNumber}");
        }
        
        void OnReady(string code)
        {
            Debug.Log("========================================");
            Debug.Log("🎮 AirConsole READY!");
            Debug.Log($"🎮 Code: {code}");
            Debug.Log("========================================");
        }
        
        void OnDestroy()
        {
            Debug.Log("🚗 AirConsoleInput.OnDestroy() CALLED");
            if (AirConsole.instance != null)
            {
                AirConsole.instance.onMessage -= OnMessage;
                AirConsole.instance.onReady -= OnReady;
                Debug.Log("✅ Unsubscribed from events");
            }
        }
        
        void Update()
        {
            if (smoothSteering)
            {
                currentTurnInput = Mathf.Lerp(currentTurnInput, targetTurnInput, Time.deltaTime * steeringSmoothSpeed);
                currentInput.TurnInput = currentTurnInput;
            }
        }
        
        private void OnMessage(int fromDeviceId, JToken data)
        {
            Debug.Log("========================================");
            Debug.Log($"🔔🔔🔔 OnMessage CALLED!");
            Debug.Log($"🔔 Device ID: {fromDeviceId}");
            Debug.Log($"🔔 Raw Data: {data.ToString()}");
            Debug.Log("========================================");
            
            // Convert device ID to player number
            int activePlayer = -1;
            try
            {
                activePlayer = AirConsole.instance.ConvertDeviceIdToPlayerNumber(fromDeviceId);
                Debug.Log($"🔔 Converted Device {fromDeviceId} → Player {activePlayer}");
                Debug.Log($"🔔 My Player Number: {playerNumber}");
                Debug.Log($"🔔 Accept Any Controller: {acceptAnyController}");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"❌ Error converting device ID: {e.Message}");
            }
            
            // Check if we should process this message
            if (!acceptAnyController && activePlayer != playerNumber)
            {
                Debug.LogWarning($"⚠️ SKIPPING - Message is for player {activePlayer}, but I am player {playerNumber}");
                Debug.LogWarning($"⚠️ Tip: Set 'Accept Any Controller' to true for single player games");
                return;
            }
            
            Debug.Log("✅✅✅ Processing message!");
            
            try
            {
                if (data["accelerate"] != null)
                {
                    currentInput.Accelerate = (bool)data["accelerate"];
                    Debug.Log($"🚗 ACCELERATE = {currentInput.Accelerate}");
                }
                
                if (data["brake"] != null)
                {
                    currentInput.Brake = (bool)data["brake"];
                    Debug.Log($"🛑 BRAKE = {currentInput.Brake}");
                }
                
                if (data["turnInput"] != null)
                {
                    targetTurnInput = (float)data["turnInput"];
                    if (!smoothSteering)
                        currentInput.TurnInput = targetTurnInput;
                    Debug.Log($"🎮 TURN = {targetTurnInput:F2}");
                }
                
                Debug.Log($"✅ New Input State - A:{currentInput.Accelerate} B:{currentInput.Brake} T:{targetTurnInput:F2}");
            }
            catch (System.Exception e)
            {
                Debug.LogError($"❌ Error parsing data: {e.Message}");
                Debug.LogError($"Stack trace: {e.StackTrace}");
            }
        }
        
        public override InputData GenerateInput()
        {
            // Log every 60 frames if we have input
            if (Time.frameCount % 60 == 0 && (currentInput.Accelerate || currentInput.Brake || Mathf.Abs(currentInput.TurnInput) > 0.01f))
            {
                Debug.Log($"⚡ GenerateInput - A:{currentInput.Accelerate} B:{currentInput.Brake} T:{currentInput.TurnInput:F2}");
            }
            
            return currentInput;
        }
        
        // Visual debug overlay
        void OnGUI()
        {
            if (!showDebug) return;
            
            int yOffset = 10 + (playerNumber * 130);
            GUI.Box(new Rect(10, yOffset, 300, 120), "");
            GUI.Label(new Rect(15, yOffset + 5, 290, 20), $"AirConsole Player {playerNumber}");
            GUI.Label(new Rect(15, yOffset + 25, 290, 20), 
                $"Accept Any: {(acceptAnyController ? "YES" : "NO")}");
            GUI.Label(new Rect(15, yOffset + 45, 290, 20), 
                $"Accelerate: {(currentInput.Accelerate ? "ON" : "OFF")}");
            GUI.Label(new Rect(15, yOffset + 65, 290, 20), 
                $"Brake: {(currentInput.Brake ? "ON" : "OFF")}");
            GUI.Label(new Rect(15, yOffset + 85, 290, 20), 
                $"Turn: {currentInput.TurnInput:F2}");
            GUI.Label(new Rect(15, yOffset + 105, 290, 20), 
                $"AirConsole: {(AirConsole.instance != null ? "CONNECTED" : "NOT FOUND")}");
        }
    }
}
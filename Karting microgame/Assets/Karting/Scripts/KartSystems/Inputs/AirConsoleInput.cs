using UnityEngine;
using NDream.AirConsole;
using Newtonsoft.Json.Linq;

namespace KartGame.KartSystems
{
    public class AirConsoleInput : BaseInput
    {
        [Header("AirConsole Settings")]
        [Tooltip("Player number (0 = first player, 1 = second player)")]
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
        }
        
        void Start()
        {
            if (AirConsole.instance == null)
            {
                Debug.LogError("AirConsoleInput: AirConsole.instance is null! Make sure AirConsole GameObject is in scene.");
                enabled = false;
                return;
            }
            
            AirConsole.instance.onMessage += OnMessage;
            Debug.Log($"AirConsoleInput: Subscribed for player {playerNumber}");
        }
        
        void OnDestroy()
        {
            if (AirConsole.instance != null)
                AirConsole.instance.onMessage -= OnMessage;
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
            int activePlayer = AirConsole.instance.ConvertDeviceIdToPlayerNumber(fromDeviceId);
            
            if (showDebug)
                Debug.Log($"[AirConsole] Message from device {fromDeviceId} (player {activePlayer}): {data}");
            
            if (activePlayer != playerNumber)
                return;
            
            try
            {
                if (data["accelerate"] != null)
                {
                    currentInput.Accelerate = (bool)data["accelerate"];
                    if (showDebug) Debug.Log($"[AirConsole] Player {playerNumber} - Accelerate: {currentInput.Accelerate}");
                }
                
                if (data["brake"] != null)
                {
                    currentInput.Brake = (bool)data["brake"];
                    if (showDebug) Debug.Log($"[AirConsole] Player {playerNumber} - Brake: {currentInput.Brake}");
                }
                
                if (data["turnInput"] != null)
                {
                    targetTurnInput = (float)data["turnInput"];
                    if (!smoothSteering)
                        currentInput.TurnInput = targetTurnInput;
                    if (showDebug) Debug.Log($"[AirConsole] Player {playerNumber} - Turn: {targetTurnInput:F2}");
                }
            }
            catch (System.Exception e)
            {
                Debug.LogWarning($"[AirConsole] Error parsing data: {e.Message}");
            }
        }
        
        public override InputData GenerateInput()
        {
            // Log alleen als er daadwerkelijk input is
            if (showDebug && (currentInput.Accelerate || currentInput.Brake || Mathf.Abs(currentInput.TurnInput) > 0.01f))
            {
                Debug.Log($"[AirConsole.GenerateInput] P{playerNumber} - Accel: {currentInput.Accelerate}, Brake: {currentInput.Brake}, Turn: {currentInput.TurnInput:F2}");
            }
            
            return currentInput;
        }
        
        // Visual debug overlay
        void OnGUI()
        {
            if (!showDebug) return;
            
            int yOffset = 10 + (playerNumber * 60);
            GUI.Box(new Rect(10, yOffset, 250, 50), "");
            GUI.Label(new Rect(15, yOffset + 5, 240, 20), $"AirConsole Player {playerNumber}");
            GUI.Label(new Rect(15, yOffset + 25, 240, 20), 
                $"A:{(currentInput.Accelerate ? "ON" : "OFF")} | B:{(currentInput.Brake ? "ON" : "OFF")} | T:{currentInput.TurnInput:F2}");
        }
    }
}

using UnityEngine;
using Newtonsoft.Json.Linq;
using System.Reflection;
using System;

namespace KartGame.KartSystems
{
    /// <summary>
    /// AirConsole input handler for racing game
    /// Receives input from smartphone controller and converts it to InputData
    /// Uses reflection to avoid assembly reference issues
    /// </summary>
    public class AirConsoleInput : BaseInput
    {
        [Header("AirConsole Settings")]
        [Tooltip("Use player number instead of device ID (0 = first player, 1 = second player)")]
        public int playerNumber = 0;

        [Header("Input Smoothing (Optional)")]
        [Tooltip("Smooth the steering input to make it less jittery")]
        public bool smoothSteering = true;
        [Tooltip("How fast the steering smooths (higher = more responsive)")]
        public float steeringSmoothSpeed = 10f;

        // Current input state
        private InputData currentInput;
        private float targetTurnInput = 0f;
        private float currentTurnInput = 0f;

        // Reflection references
        private object airConsoleInstance;
        private Type airConsoleType;
        private MethodInfo convertDeviceIdToPlayerNumberMethod;

        void Awake()
        {
            // Initialize input data
            currentInput = new InputData
            {
                Accelerate = false,
                Brake = false,
                TurnInput = 0f
            };
        }

        void Start()
        {
            // Find AirConsole type using reflection
            airConsoleType = Type.GetType("NDream.AirConsole.AirConsole, Assembly-CSharp");
            
            if (airConsoleType == null)
            {
                // Try alternative assembly name
                airConsoleType = Type.GetType("NDream.AirConsole.AirConsole, Assembly-CSharp-firstpass");
            }

            if (airConsoleType == null)
            {
                Debug.LogError("AirConsoleInput: Could not find AirConsole type. Make sure AirConsole is imported correctly.");
                enabled = false;
                return;
            }

            // Get the AirConsole instance
            PropertyInfo instanceProperty = airConsoleType.GetProperty("instance", BindingFlags.Public | BindingFlags.Static);
            
            if (instanceProperty == null)
            {
                Debug.LogError("AirConsoleInput: Could not find AirConsole.instance property.");
                enabled = false;
                return;
            }

            airConsoleInstance = instanceProperty.GetValue(null);

            if (airConsoleInstance == null)
            {
                Debug.LogError("AirConsoleInput: AirConsole.instance is null. Make sure AirConsole GameObject is in the scene.");
                enabled = false;
                return;
            }

            // Get the ConvertDeviceIdToPlayerNumber method
            convertDeviceIdToPlayerNumberMethod = airConsoleType.GetMethod("ConvertDeviceIdToPlayerNumber", BindingFlags.Public | BindingFlags.Instance);

            // Subscribe to onMessage event using reflection
            EventInfo onMessageEvent = airConsoleType.GetEvent("onMessage");
            
            if (onMessageEvent != null)
            {
                // Create delegate that matches the event signature: void OnMessage(int from, JToken data)
                Type delegateType = onMessageEvent.EventHandlerType;
                Delegate handler = Delegate.CreateDelegate(delegateType, this, "OnMessage");
                onMessageEvent.AddEventHandler(airConsoleInstance, handler);
                
                Debug.Log("AirConsoleInput: Successfully subscribed to AirConsole messages for player " + playerNumber);
            }
            else
            {
                Debug.LogError("AirConsoleInput: Could not find onMessage event on AirConsole.");
                enabled = false;
            }
        }

        void OnDestroy()
        {
            // Unsubscribe from events when destroyed
            if (airConsoleInstance != null && airConsoleType != null)
            {
                EventInfo onMessageEvent = airConsoleType.GetEvent("onMessage");
                
                if (onMessageEvent != null)
                {
                    Type delegateType = onMessageEvent.EventHandlerType;
                    Delegate handler = Delegate.CreateDelegate(delegateType, this, "OnMessage");
                    onMessageEvent.RemoveEventHandler(airConsoleInstance, handler);
                }
            }
        }

        void Update()
        {
            // Apply input smoothing if enabled
            if (smoothSteering)
            {
                currentTurnInput = Mathf.Lerp(currentTurnInput, targetTurnInput, Time.deltaTime * steeringSmoothSpeed);
                currentInput.TurnInput = currentTurnInput;
            }
        }

        /// <summary>
        /// Called when a message is received from an AirConsole controller
        /// This method signature must match: void OnMessage(int from, JToken data)
        /// </summary>
        void OnMessage(int fromDeviceId, JToken data)
        {
            // Convert device ID to player number using reflection
            int activePlayer = -1;
            
            if (convertDeviceIdToPlayerNumberMethod != null)
            {
                object result = convertDeviceIdToPlayerNumberMethod.Invoke(airConsoleInstance, new object[] { fromDeviceId });
                activePlayer = (int)result;
            }
            
            // Check if message is from our player
            if (activePlayer != playerNumber)
                return;

            try
            {
                // Parse the controller data
                if (data["accelerate"] != null)
                {
                    currentInput.Accelerate = (bool)data["accelerate"];
                }

                if (data["brake"] != null)
                {
                    currentInput.Brake = (bool)data["brake"];
                }

                if (data["turnInput"] != null)
                {
                    targetTurnInput = (float)data["turnInput"];
                    
                    // If smoothing is disabled, apply immediately
                    if (!smoothSteering)
                    {
                        currentInput.TurnInput = targetTurnInput;
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning("AirConsoleInput: Error parsing controller data: " + e.Message);
            }
        }

        /// <summary>
        /// Generate input data for the kart
        /// </summary>
        public override InputData GenerateInput()
        {
            return currentInput;
        }

        /// <summary>
        /// Get debug info about current input state
        /// </summary>
        public string GetDebugInfo()
        {
            return string.Format("Turn: {0:F2} | Gas: {1} | Brake: {2}", 
                currentInput.TurnInput, 
                currentInput.Accelerate, 
                currentInput.Brake);
        }
    }
}
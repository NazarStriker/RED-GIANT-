import { GoogleGenAI, Type } from "@google/genai";
import { GameState, TurnResponse } from "../types";

// === CONFIGURATION ===
const MODEL_BRAIN = "gemini-3-pro-preview";       // Logic & Story
const MODEL_ARTIST = "gemini-2.5-flash-image";    // Visual Generation
const MODEL_CRITIC = "gemini-2.5-flash";          // Visual Validation

// === PHYSICS CONSTANTS (DETERMINISTIC ENTROPY) ===
const ENTROPY_RULES = {
    BASE_COST_PER_TURN: { hunger: 1, thirst: 2, oxygen: 1 }, 
    ACTIONS: {
        "HIGH_EFFORT": { hunger: 5, thirst: 8, oxygen: 5 }, 
        "MED_EFFORT":  { hunger: 3, thirst: 4, oxygen: 2 }, 
        "LOW_EFFORT":  { hunger: 1, thirst: 1, oxygen: 1 }, 
    }
};

// Initial Game State
export const INITIAL_STATE: GameState = {
  health: 100,
  oxygen: 100,
  hunger: 100, // 100 = Full
  thirst: 100, // 100 = Hydrated
  temperature: 28, // Start warm
  time: "03:00",
  location: "Спальня (Кровать)", 
  inventory: ["Смартфон"],
  knowledgeBase: [
    "СТАТУС: Игрок проснулся в 03:00 ночи.",
    "ЛОР: 4 Миллиарда лет спустя. Красный Гигант занимает полнеба.",
    "ЛОР: Возраст игрока заморожен, но тело уязвимо.",
    "ЦЕЛЬ: Выжить до рассвета (05:00) и найти БУНКЕРА.",
    "ОКРУЖЕНИЕ: 03:00. Ночь. Темно, но горизонт светится красным.",
  ],
  visualContext: "POV: Лежу в кровати. Видны мои ноги под одеялом. Темная спальня, слабый красный свет сквозь жалюзи. В руке смартфон.",
  isGameOver: false,
  gamePhase: 'awakening'
};

// === THE BRAIN: SYSTEM INSTRUCTION ===
const SYSTEM_INSTRUCTION = `
РОЛЬ: Ты — СЛОЖНЫЙ СИМУЛЯТОР ВЫЖИВАНИЯ (PHYSICS ENGINE & DM).
Твоя задача — управлять миром "Last Survivor: Red Giant".

================================================================================
РАЗДЕЛ 1: ЦИКЛ КРАСНОГО ГИГАНТА (СВЕТ И ВРЕМЯ)
================================================================================
Ты обязан следить за временем и менять освещение:

1. **НОЧЬ (03:00 - 03:59)**
   - ВИЗУАЛ: Очень темно. Черные тени.
   - СВЕТ: Только слабое, зловещее красное свечение (радиация) на горизонте или сквозь щели окон.
   - АТМОСФЕРА: Тишина перед бурей.

2. **ПРЕДРАССВЕТ (04:00 - 04:59)**
   - ВИЗУАЛ: Сумрак. Цвета искажаются.
   - СВЕТ: Небо становится багрово-фиолетовым. Света больше, но он "больной".
   - АТМОСФЕРА: Становится невыносимо жарко. Дым начинает идти от пластика.

3. **ВОСХОД / АД (05:00+)**
   - ВИЗУАЛ: ВСЁ ГОРИТ. Слепящий красный свет.
   - СВЕТ: Гигант взошел. Прямые лучи испаряют краску и поджигают дерево.
   - ЭФФЕКТ: Игрок получает урон каждую секунду, если не в бункере/скафандре.

================================================================================
РАЗДЕЛ 2: БИОЛОГИЯ И ЭНТРОПИЯ
================================================================================
1. **ЗАКОН НЕУМОЛИМОГО УВЯДАНИЯ:**
   - Статы ВСЕГДА падают.
   - Если Температура > 50°C -> Здоровье падает (-5 за ход).
   - Если Температура > 50°C -> Жажда падает двойными темпами (-10 за ход).

2. **ЗАКОН ПОТРЕБЛЕНИЯ:**
   - Повышение статов ТОЛЬКО через предметы (Еда, Вода).

================================================================================
РАЗДЕЛ 3: ВИЗУАЛЬНЫЙ КОД (IMAGE PROMPT)
================================================================================
Ты пишешь ТЕХНИЧЕСКИЙ ПРОМПТ.
- Всегда начинай с POV.
- Учитывай время: 
  - Если 03:00 -> "Dark environment, dim red rim light".
  - Если 05:00 -> "Blinding bright red light, burning atmosphere, smoke, fire particles".

ВЫВОД: JSON.
`;

// === HELPER: TIME & TEMPERATURE PHYSICS ===
function getMinutesFromTime(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function calculateDeterministicStats(
    current: GameState, 
    action: string, 
    aiCalculatedState: GameState
): GameState {
    const newState = { ...aiCalculatedState };
    const actionLower = action.toLowerCase();
    
    // 1. TIME PARSING & TEMPERATURE CURVE
    const currentMinutes = getMinutesFromTime(newState.time);
    const startMinutes = 3 * 60; // 03:00 (180 min)
    const hellMinutes = 5 * 60;  // 05:00 (300 min)
    
    // Calculate Temp based on time progression (Exponential curve)
    // 03:00 = 28C, 04:00 = 38C, 05:00 = 60C+ (Death zone)
    let targetTemp = 28;
    if (currentMinutes >= hellMinutes) {
        targetTemp = 60 + (currentMinutes - hellMinutes) * 0.5; // Rapid heat up after 5 AM
    } else {
        const progress = (currentMinutes - startMinutes) / (hellMinutes - startMinutes);
        targetTemp = 28 + (progress * progress) * 32; // Curve to 60C
    }
    
    newState.temperature = Math.floor(targetTemp);

    // 2. DETECT EFFORT LEVEL
    let effort = { ...ENTROPY_RULES.BASE_COST_PER_TURN }; 
    if (actionLower.match(/беж|бег|быстро|рывок|лом|тащ|подн|дра|удар/i)) {
        effort = ENTROPY_RULES.ACTIONS.HIGH_EFFORT;
    } else if (actionLower.match(/идт|пойти|иска|оде|взят|откр/i)) {
        effort = ENTROPY_RULES.ACTIONS.MED_EFFORT;
    }

    // 3. ENVIRONMENTAL DAMAGE (THE RED GIANT EFFECT)
    // If it's past 5 AM or Temp is > 50, physics deals damage regardless of AI.
    if (newState.temperature >= 50) {
        newState.health = Math.max(0, newState.health - 5); // Burn damage
        effort.thirst += 5; // Extreme dehydration
        effort.hunger += 2; // Calories burn faster in heat
        
        // Inject system warning if AI didn't
        if (current.health > 80 && newState.health <= 80) {
            // This is implicitly handled by the UI showing red stats
        }
    }

    // 4. APPLY CONSUMPTION LOGIC
    const isEating = actionLower.match(/ест|съел|куша|хава|жра/i);
    const isDrinking = actionLower.match(/пил|выпил|глот/i);

    // HUNGER
    if (!isEating) {
        const expectedHunger = Math.max(0, current.hunger - effort.hunger);
        // Prevent magic healing
        newState.hunger = Math.min(newState.hunger, expectedHunger); 
    }

    // THIRST
    if (!isDrinking) {
        const expectedThirst = Math.max(0, current.thirst - effort.thirst);
        newState.thirst = Math.min(newState.thirst, expectedThirst);
    }

    // OXYGEN
    newState.oxygen = Math.min(newState.oxygen, Math.max(0, current.oxygen - effort.oxygen));

    // CHECK GAME OVER
    if (newState.health <= 0) newState.isGameOver = true;

    return newState;
}


// === MAIN LOGIC FUNCTION ===
export async function advanceGameTurn(
  history: string[],
  currentState: GameState,
  userAction: string
): Promise<TurnResponse> {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const relevantHistory = history.length > 10 ? history.slice(-10) : history;

  const prompt = `
    [[SYSTEM STATUS]]
    TIME: ${currentState.time}
    STATS: HP=${currentState.health}, O2=${currentState.oxygen}, FOOD=${currentState.hunger}, H2O=${currentState.thirst}, TEMP=${currentState.temperature}C
    INV: ${JSON.stringify(currentState.inventory)}
    LOC: ${currentState.location}
    
    [[USER INPUT]]
    ACTION: "${userAction}"
    
    [[TASK]]
    1. Update Time (+5-15 mins).
    2. CHECK TIME PHASE:
       - 03:00-04:00: Night. Dark + Red Radiation.
       - 04:00-05:00: Dawn. Heat rising.
       - 05:00+: INFERNO. Everything burns.
    3. Generate "imagePrompt" (TECHNICAL KEYWORDS, POV).
       - If 05:00+, prompt MUST include "fire, smoke, blinding red light".
    4. Generate "story" (Russian).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_BRAIN,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 4096 }, 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            soundCue: { 
              type: Type.STRING, 
              enum: ['NONE', 'FOOTSTEPS', 'CLOTH_RUSTLE', 'DOOR_OPEN', 'HEARTBEAT', 'ALARM', 'FIRE_CRACKLE', 'BREATHING'] 
            },
            gameState: {
              type: Type.OBJECT,
              properties: {
                health: { type: Type.NUMBER },
                oxygen: { type: Type.NUMBER },
                hunger: { type: Type.NUMBER },
                thirst: { type: Type.NUMBER },
                temperature: { type: Type.NUMBER },
                time: { type: Type.STRING },
                location: { type: Type.STRING },
                inventory: { type: Type.ARRAY, items: { type: Type.STRING } },
                knowledgeBase: { type: Type.ARRAY, items: { type: Type.STRING } },
                visualContext: { type: Type.STRING },
                isGameOver: { type: Type.BOOLEAN },
                gamePhase: { type: Type.STRING }
              },
              required: ["health", "oxygen", "hunger", "thirst", "temperature", "time", "location", "inventory", "knowledgeBase", "visualContext", "isGameOver", "gamePhase"]
            }
          },
          required: ["story", "imagePrompt", "soundCue", "gameState"]
        }
      }
    });

    const result = JSON.parse(response.text.trim()) as TurnResponse;
    
    // === ENFORCE PHYSICS ENGINE ===
    // We override AI math with our deterministic Time/Temp/Damage logic
    result.gameState = calculateDeterministicStats(currentState, userAction, result.gameState);

    return result;

  } catch (error) {
    console.error("Game Logic Crash:", error);
    return {
      story: "СИСТЕМА: Температурный сбой сенсоров... (Ошибка ИИ)",
      imagePrompt: "Red static noise, heat distortion, glitch screen",
      soundCue: 'ALARM',
      gameState: currentState
    };
  }
}

// === VISUAL PIPELINE "THE FORGE" ===

const GLOBAL_NEGATIVE_PROMPT = `
nsfw, nude, third person, back view, selfie, multiple people, two people, portrait, 
character face, mirror reflection, text, hud, ui, watermark, low quality, 
cartoon, anime, drawing, sketch, split screen, collage, floating objects, 
glitch, distorted hands, bad anatomy, extra fingers, missing limbs, 
bright blue sky, happy atmosphere, green grass, camera on tripod, 
cinematic shot of actor, looking at character.
`;

const BASE_VISUAL_STYLE = `
Style: REALISTIC BODYCAM FOOTAGE (Unreal Engine 5).
Perspective: STRICT FIRST PERSON (POV).
Lens: Wide Angle GoPro.
Lighting: Volumetric Red Fog, High Contrast, Sweaty.
`;

// "THE CRITIC"
async function critiqueImage(base64Image: string, prompt: string): Promise<{valid: boolean; errorType?: string; fixInstruction?: string}> {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const analysisPrompt = `
        ROLE: Quality Control AI for a First-Person Survival Game.
        INPUT PROMPT: "${prompt}"
        
        TASK: Check if the image matches the prompt and POV rules.
        
        STRICT FAIL CONDITIONS:
        1. [THIRD_PERSON]: Visible back, head, or full body.
        2. [HALLUCINATION]: Multiple people, floating items.
        3. [CONTEXT_ERROR]: Prompt says "holding item" but hands are empty.
        
        Return JSON: { "valid": boolean, "errorType": "THIRD_PERSON" | "HALLUCINATION" | "CONTEXT_ERROR" | "NONE", "fixInstruction": string }
        `;

        const response = await ai.models.generateContent({
            model: MODEL_CRITIC,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: analysisPrompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        return JSON.parse(response.text.trim());
    } catch (e) {
        console.warn("Critic offline, bypassing.");
        return { valid: true }; 
    }
}

export async function generateVisual(prompt: string, attempt = 1, corrections = ""): Promise<string | undefined> {
   if (attempt > 3) {
       console.warn("Visual Pipeline: Max retries exhausted.");
       return undefined; 
   }

   try {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     
     let engineeredPrompt = `${BASE_VISUAL_STYLE}\nSCENE: ${prompt}\n${GLOBAL_NEGATIVE_PROMPT}`;
     
     if (corrections) {
         engineeredPrompt = `
         !!! CORRECTION MODE !!! 
         PREVIOUS ERROR: ${corrections}
         MANDATORY FIX: FORCE CAMERA TO EYE LEVEL. DO NOT SHOW CHARACTER BODY.
         
         ${BASE_VISUAL_STYLE}
         SCENE: ${prompt}
         ${GLOBAL_NEGATIVE_PROMPT}
         `;
     }

     console.log(`[GEN] Attempt ${attempt} | Prompt: ${prompt.substring(0, 50)}...`);

     const response = await ai.models.generateContent({
        model: MODEL_ARTIST, 
        contents: { parts: [{ text: engineeredPrompt }] },
        config: { imageConfig: { aspectRatio: "16:9" } }
     });

     let base64Image = "";
     if (response.candidates && response.candidates[0].content.parts) {
         for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 base64Image = part.inlineData.data;
             }
         }
     }

     if (!base64Image) throw new Error("No image data returned");

     const critique = await critiqueImage(base64Image, prompt);

     if (!critique.valid) {
         console.warn(`[REJECT] Reason: ${critique.errorType} | Fix: ${critique.fixInstruction}`);
         return generateVisual(prompt, attempt + 1, critique.fixInstruction || "Force POV");
     }

     return `data:image/jpeg;base64,${base64Image}`;

   } catch (e) {
       console.error("Visual Pipeline Error:", e);
       if (attempt < 3) return generateVisual(prompt, attempt + 1, "Retry after crash");
       return undefined;
   }
}

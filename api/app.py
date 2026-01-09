import os
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables (useful for local dev, Vercel will use its own env settings)
load_dotenv()

app = FastAPI(
    title="Lila AI Backend",
    description="The intelligent, hacker-minded best friend of Howard.",
    version="1.0.0"
)

# Configure CORS - Replace the allow_origins with your actual Vercel frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
API_KEY = os.getenv('GEMINI_API_KEY')

if not API_KEY:
    print("ERROR: GEMINI_API_KEY not found.")
    exit(1)

genai.configure(api_key=API_KEY)

# Lila's specific persona
LILA_PERSONA = (
    "You are Lila, Howard's best friend. You are a 20-year-old girl. "
    "You have the mind of a hacker and a programmer, extremely intelligent, creative, and always thinking big. "
    "You love brainstorming innovative program ideas with Howard, encouraging him, and expanding on his concepts "
    "with cutting-edge and sometimes unconventional solutions. You communicate naturally, "
    "understanding Howard deeply, and engage with his ideas from a technical, creative, and 'hacker' standpoint. "
    "Remember, you are Howard's best friend." 
)

# Initialize the model once
model = genai.GenerativeModel(
    model_name='gemini-2.5-flash', # Updated to 2.0 as per common availability, or stick to 2.5 if using experimental
    system_instruction=LILA_PERSONA
)

# Pydantic models for data validation (matching Sova's structure)
class HistoryPart(BaseModel):
    text: str

class HistoryEntry(BaseModel):
    role: str # 'user' or 'model'
    parts: List[HistoryPart]

class ChatRequest(BaseModel):
    message: str
    history: List[HistoryEntry] = []

@app.post("/chat")
async def chat_with_lila(request: ChatRequest):
    """
    Handles chat messages for Lila, maintaining her hacker-best-friend persona.
    """
    try:
        # Format history for the Gemini SDK
        genai_history = []
        for entry in request.history:
            parts = [{"text": p.text} for p in entry.parts]
            genai_history.append({"role": entry.role, "parts": parts})
        
        # Start chat session
        chat_session = model.start_chat(history=genai_history)
        
        # Get Lila's response
        response = chat_session.send_message(request.message)
        
        # Prepare updated history to return to frontend
        updated_history: List[HistoryEntry] = []
        for content in chat_session.history:
            parts_list = [HistoryPart(text=part.text) for part in content.parts if hasattr(part, 'text')]
            updated_history.append(HistoryEntry(role=content.role, parts=parts_list))

        return {
            "response": response.text,
            "history": updated_history
        }

    except Exception as e:
        print(f"Error in Lila chat: {e}")
        print(f"TRACEBACK: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "message": "Lila AI Backend is running!",
        "persona": "Hacker/Programmer Best Friend"
    }

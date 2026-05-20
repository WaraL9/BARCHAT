import "server-only";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY ?? "";

export const ai = new GoogleGenAI({ apiKey });

export const DEFAULT_MODEL = "gemini-2.5-flash";

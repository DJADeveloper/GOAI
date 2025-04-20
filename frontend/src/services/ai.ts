import OpenAI from 'openai';
import { Goal, Task, Habit, ProgressEvent } from '../types';

// Debug environment variable
console.log('VITE_OPENAI_API_KEY exists:', !!import.meta.env.VITE_OPENAI_API_KEY);

if (!import.meta.env.VITE_OPENAI_API_KEY) {
  throw new Error('OpenAI API key is not set in environment variables');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, proxy through backend
});

export type AIResponse = {
  content: string;
  success: boolean;
  error?: string;
};

export type GoalSuggestion = {
  title: string;
  description: string;
  estimatedDuration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  keyMilestones: string[];
};

export type TaskBreakdown = {
  tasks: {
    title: string;
    description: string;
    estimatedDuration: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  suggestions: string[];
};

export type HabitRecommendation = {
  name: string;
  description: string;
  frequency: string;
  benefit: string;
  scientificBacking?: string;
};

class AIService {
  private static instance: AIService;
  private lastCallTimestamp: number = 0;
  private readonly minDelay: number = 1000; // Minimum delay between API calls

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTimestamp;
    if (timeSinceLastCall < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastCall));
    }
    this.lastCallTimestamp = Date.now();
  }

  private async makeAIRequest(
    prompt: string,
    systemPrompt: string = "You are a helpful AI assistant specializing in personal development and productivity."
  ): Promise<AIResponse> {
    try {
      await this.enforceRateLimit();

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      return {
        content: completion.choices[0]?.message?.content || "",
        success: true
      };
    } catch (error: any) {
      console.error('AI Request failed:', error);
      return {
        content: "",
        success: false,
        error: error.message
      };
    }
  }

  async suggestGoals(
    interests: string[],
    currentGoals: Goal[],
    timeframe: 'short' | 'medium' | 'long'
  ): Promise<GoalSuggestion[]> {
    const prompt = `Based on the user's interests: ${interests.join(', ')} and their current goals: ${currentGoals.map(g => g.title).join(', ')}, suggest 3 ${timeframe}-term goals. Consider goal alignment and progressive difficulty. Format as JSON array with properties: title, description, estimatedDuration, difficulty, and keyMilestones.`;

    const response = await this.makeAIRequest(prompt);
    if (!response.success) return [];

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse goal suggestions:', error);
      return [];
    }
  }

  async breakdownGoalIntoTasks(goal: Goal): Promise<TaskBreakdown> {
    const prompt = `Break down this goal into actionable tasks: "${goal.title}: ${goal.description}". Consider dependencies, priority, and logical sequence. Format as JSON with properties: tasks (array of task objects with title, description, estimatedDuration, priority) and suggestions (array of strings with additional tips).`;

    const response = await this.makeAIRequest(prompt);
    if (!response.success) return { tasks: [], suggestions: [] };

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse task breakdown:', error);
      return { tasks: [], suggestions: [] };
    }
  }

  async suggestHabits(
    goals: Goal[],
    currentHabits: Habit[],
    progressEvents: ProgressEvent[]
  ): Promise<HabitRecommendation[]> {
    const prompt = `Based on the user's goals: ${goals.map(g => g.title).join(', ')} and current habits: ${currentHabits.map(h => h.name).join(', ')}, suggest 3 new habits that would help achieve these goals. Consider habit stacking and current progress patterns. Format as JSON array with properties: name, description, frequency, benefit, and scientificBacking.`;

    const response = await this.makeAIRequest(prompt);
    if (!response.success) return [];

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse habit recommendations:', error);
      return [];
    }
  }

  async analyzeProgress(
    goals: Goal[],
    tasks: Task[],
    habits: Habit[],
    progressEvents: ProgressEvent[]
  ): Promise<string> {
    const prompt = `Analyze the user's progress:
    Goals: ${goals.map(g => `${g.title} (${g.status})`).join(', ')}
    Tasks Completed: ${tasks.filter(t => t.completed).length}/${tasks.length}
    Habit Completion Rate: ${progressEvents.length} events for ${habits.length} habits
    
    Provide a motivating analysis with specific observations and actionable suggestions.`;

    const response = await this.makeAIRequest(prompt);
    return response.success ? response.content : "Unable to analyze progress at this time.";
  }

  async getMotivationalMessage(context: {
    recentWins?: string[];
    currentChallenges?: string[];
    mood?: string;
  }): Promise<string> {
    const prompt = `Create a personalized motivational message based on:
    Recent Wins: ${context.recentWins?.join(', ') || 'None provided'}
    Current Challenges: ${context.currentChallenges?.join(', ') || 'None provided'}
    Current Mood: ${context.mood || 'Not specified'}
    
    Keep it concise, authentic, and actionable.`;

    const response = await this.makeAIRequest(prompt);
    return response.success ? response.content : "You've got this! Keep pushing forward.";
  }
}

export const aiService = AIService.getInstance(); 
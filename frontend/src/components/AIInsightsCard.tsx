import React, { useState, useEffect } from 'react';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { aiService } from '../services/ai';
import { Goal, Task, Habit, ProgressEvent } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface AIInsightsCardProps {
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  progressEvents: ProgressEvent[];
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  goals,
  tasks,
  habits,
  progressEvents,
}) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get progress analysis
      const analysisResult = await aiService.analyzeProgress(
        goals,
        tasks,
        habits,
        progressEvents
      );

      // Get habit recommendations
      const habitRecommendations = await aiService.suggestHabits(
        goals,
        habits,
        progressEvents
      );

      setAnalysis(analysisResult);
      setRecommendations(
        habitRecommendations.map(
          rec => `${rec.name}: ${rec.description} (${rec.frequency})`
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to fetch AI insights');
      console.error('Error fetching AI insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [goals, tasks, habits, progressEvents]);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-primary dark:text-primary-light" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            AI Insights
          </h2>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors duration-200 disabled:opacity-50"
          title="Refresh insights"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-1/2"></div>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-danger dark:text-danger-light text-sm"
          >
            {error}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Progress Analysis */}
            <div className="prose dark:prose-invert max-w-none text-sm">
              <h3 className="text-base font-medium text-neutral-900 dark:text-white mb-2">
                Progress Analysis
              </h3>
              <p className="text-neutral-600 dark:text-neutral-300">{analysis}</p>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-base font-medium text-neutral-900 dark:text-white mb-2">
                  Recommended Habits
                </h3>
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start space-x-2 text-sm text-neutral-600 dark:text-neutral-300"
                    >
                      <span className="text-primary dark:text-primary-light">•</span>
                      <span>{rec}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIInsightsCard; 
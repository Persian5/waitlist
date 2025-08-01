import { useState, useEffect, useRef } from 'react'
import { Flashcard } from '@/app/components/games/Flashcard'
import { Quiz } from '@/app/components/games/Quiz'
import { InputExercise } from '@/app/components/games/InputExercise'
import { MatchingGame } from '@/app/components/games/MatchingGame'
import { FinalChallenge } from '@/app/components/games/FinalChallenge'
import { WelcomeIntro } from '@/app/components/games/WelcomeIntro'
import { LessonStep, WelcomeStep, FlashcardStep, QuizStep, InputStep, MatchingStep, FinalStep } from '@/lib/types'
import { XpService } from '@/lib/services/xp-service'

interface LessonRunnerProps {
  steps: LessonStep[];
  xp: number;
  addXp: (amount: number, source: string, metadata?: any) => void;
  progress?: number;
  onProgressChange?: (progress: number) => void;
  currentView?: string;
  onViewChange?: (view: string) => void;
  onSaveState?: (state: { progress: number, currentStep: number }) => void;
}

export function LessonRunner({ 
  steps, 
  xp, 
  addXp, 
  progress, 
  onProgressChange,
  currentView,
  onViewChange,
  onSaveState
}: LessonRunnerProps) {
  const [idx, setIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false) // For flashcard
  const [showContinue, setShowContinue] = useState(false) // For flashcard
  const stateRef = useRef<HTMLDivElement>(null);

  // Setup event listener for going back
  useEffect(() => {
    const handleGoBack = (e: any) => {
      const { stepIndex } = e.detail;
      setIdx(stepIndex);
      setIsFlipped(false);
      setShowContinue(false);
    };

    const stateEl = stateRef.current;
    if (stateEl) {
      stateEl.addEventListener('go-back', handleGoBack);
    }

    return () => {
      if (stateEl) {
        stateEl.removeEventListener('go-back', handleGoBack);
      }
    };
  }, []);

  // Update progress when step changes
  useEffect(() => {
    if (onProgressChange) {
      // Calculate progress based on current step index
      const progressValue = Math.min(100, Math.round((idx / steps.length) * 100));
      onProgressChange(progressValue);
    }
    
    // Update current view type
    if (onViewChange && idx < steps.length) {
      onViewChange(steps[idx].type);
    }
  }, [idx, steps.length, onProgressChange, onViewChange, steps]);

  // If we've gone through all steps, show completion
  if (idx >= steps.length) {
    if (onProgressChange) {
      onProgressChange(100);
    }
    if (onViewChange) {
      onViewChange('completion');
    }
    
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Lesson Complete!</h2>
        <p>You earned {XpService.formatXp(xp)}</p>
      </div>
    );
  }

  const step = steps[idx]

  const next = () => {
    // Save current state before moving to next step
    if (onSaveState) {
      onSaveState({
        progress: progress || 0,
        currentStep: idx
      });
    }
    
    setIdx(i => i + 1);
  }

  // Create activity-specific XP handlers using the XP service
  const createXpHandler = (activityType: 'flashcard' | 'quiz' | 'input' | 'matching' | 'final') => {
    return () => {
      const xpReward = XpService.getReward(
        activityType === 'flashcard' ? 'FLASHCARD_FLIP' :
        activityType === 'quiz' ? 'QUIZ_CORRECT' :
        activityType === 'input' ? 'INPUT_CORRECT' :
        activityType === 'matching' ? 'MATCHING_COMPLETE' :
        'FINAL_CHALLENGE'
      );
      
      // Directly add XP amount instead of doing math with current total
      addXp(xpReward.amount, xpReward.source, {
        activityType,
        stepIndex: idx
      });
    };
  };
  
  // Generic handler for all components except Flashcard
  const handleItemComplete = () => {
    // Don't award XP here - it's already handled in each component via onXpStart
    // Just advance to next step
    next();
  }

  // Flashcard specific handlers
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!isFlipped) {
      setShowContinue(true);
    }
  }

  const handleFlashcardContinue = () => {
    // Don't award XP here - it's already handled in the Flashcard component via onXpStart
    // Just advance to the next step
    next();
    // Reset flashcard state for next time we see a flashcard
    setIsFlipped(false);
    setShowContinue(false);
  }

  return (
    <>
      <div id="lesson-runner-state" ref={stateRef} style={{ display: 'none' }} />
      {/* Render current step based on type */}
      {step.type === 'welcome' ? (
        <WelcomeIntro 
          title={(step as WelcomeStep).title} 
          description={(step as WelcomeStep).description}
          objectives={(step as WelcomeStep).data?.objectives}
          lessonType={(step as WelcomeStep).data?.lessonType}
          onStart={next} 
        />
      ) : step.type === 'flashcard' ? (
        <Flashcard
          front={(step as FlashcardStep).data.front}
          back={(step as FlashcardStep).data.back}
          points={step.points}
          onContinue={handleFlashcardContinue}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          showContinueButton={showContinue}
          onXpStart={createXpHandler('flashcard')}
        />
      ) : step.type === 'quiz' ? (
        <Quiz
          prompt={(step as QuizStep).data.prompt}
          options={(step as QuizStep).data.options}
          correct={(step as QuizStep).data.correct}
          points={step.points}
          onComplete={handleItemComplete}
          onXpStart={createXpHandler('quiz')}
        />
      ) : step.type === 'input' ? (
        <InputExercise
          question={(step as InputStep).data.question}
          answer={(step as InputStep).data.answer}
          points={step.points}
          onComplete={handleItemComplete}
          onXpStart={createXpHandler('input')}
        />
      ) : step.type === 'matching' ? (
        <MatchingGame
          words={(step as MatchingStep).data.words}
          slots={(step as MatchingStep).data.slots}
          points={step.points}
          onComplete={handleItemComplete}
          onXpStart={createXpHandler('matching')}
        />
      ) : step.type === 'final' ? (
        <FinalChallenge
          targetWords={(step as FinalStep).data.targetWords}
          points={step.points}
          onComplete={handleItemComplete}
          onXpStart={createXpHandler('final')}
        />
      ) : null}
    </>
  );
} 

"use client"
import { SentimentAnalyzer } from '@/components/sentiment/sentiment-analyzer';


export default function SentimentPage() {
  
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Sentiment Analysis</h1>
        <p className="text-muted-foreground">
            Use AI to analyze the sentiment of customer feedback or any other text.
        </p>
      </div>
      
      <SentimentAnalyzer />
      
    </div>
  );
}

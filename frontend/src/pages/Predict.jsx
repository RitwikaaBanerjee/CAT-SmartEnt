import PredictionCard from '../components/PredictionCard';

export default function Predict() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">ML Prediction</h1>
        <p className="text-sm text-text-secondary mt-1">
          Input equipment operational parameters to predict utilization status and risk level using our trained Random Forest model.
        </p>
      </div>

      <PredictionCard />
    </div>
  );
}

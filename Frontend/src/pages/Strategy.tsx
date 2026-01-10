import { Card } from '@/components/ui/card';
import { Settings } from 'lucide-react';

const Strategy = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-12 text-center max-w-md">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <Settings className="w-24 h-24 text-primary animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 animate-pulse" />
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Implementar Estrategia</h2>
            <p className="text-muted-foreground mb-6">
              La funcionalidad de estrategias de trading bot está actualmente en desarrollo.
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">Pendiente a implementar</span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Strategy;

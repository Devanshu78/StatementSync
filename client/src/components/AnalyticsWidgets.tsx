import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Target,
  BarChart3
} from "lucide-react";

interface AnalyticsData {
  totalTransactions: number;
  matched: number;
  mismatched: number;
  matchAccuracy: number;
  lastUploadDate?: string;
}

interface AnalyticsWidgetsProps {
  data: AnalyticsData | null;
}

export const AnalyticsWidgets = ({ data }: AnalyticsWidgetsProps) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded mb-3"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const widgets = [
    {
      title: "Total Transactions",
      value: data.totalTransactions,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary-light/20"
    },
    {
      title: "Match Accuracy",
      value: `${data.matchAccuracy}%`,
      icon: Target,
      color: "text-success",
      bgColor: "bg-success-light/20",
      showProgress: true,
      progressValue: data.matchAccuracy
    },
    {
      title: "Matched Records", 
      value: data.matched,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success-light/20"
    },
    {
      title: "Anomalies Found",
      value: data.mismatched,
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning-light/20"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Analytics Overview</h3>
          <p className="text-sm text-muted-foreground">
            {data.lastUploadDate && (
              <span className="flex items-center space-x-1 mt-1">
                <Calendar className="h-3 w-3" />
                <span>Last upload: {new Date(data.lastUploadDate).toLocaleDateString()}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span className="text-xs">Live Data</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((widget, index) => (
          <Card 
            key={index} 
            className="border-border hover:shadow-md transition-smooth cursor-pointer hover-scale"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${widget.bgColor}`}>
                  <widget.icon className={`h-4 w-4 ${widget.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {widget.title}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${widget.color}`}>
                  {widget.value}
                </div>
                
                {widget.showProgress && (
                  <div className="space-y-1">
                    <Progress 
                      value={widget.progressValue} 
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground">
                      {widget.progressValue >= 95 ? "Excellent" : 
                       widget.progressValue >= 85 ? "Good" : "Needs Review"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
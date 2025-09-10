import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, XCircle } from "lucide-react";

interface Anomaly {
  date: string;
  description: string;
  bankAmount: string;
  shopAmount: string;
  status: string;
  reason?: string;
  severity?: "high" | "medium" | "low";
}

interface ResultsTableProps {
  anomalies: Anomaly[];
}

export const ResultsTable = ({ anomalies }: ResultsTableProps) => {
  const getStatusBadge = (status: string, severity?: "high" | "medium" | "low") => {
    const getSeverityColor = (sev?: string) => {
      switch (sev) {
        case "high": return "bg-destructive-light text-destructive border-destructive/20";
        case "medium": return "bg-warning-light text-warning border-warning/20";
        case "low": return "bg-muted text-muted-foreground border-muted/20";
        default: return "bg-warning-light text-warning border-warning/20";
      }
    };

    switch (status) {
      case "Amount Mismatch":
        return (
          <Badge variant="secondary" className={getSeverityColor(severity)}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Amount Mismatch
          </Badge>
        );
      case "Missing Transaction":
        return (
          <Badge variant="secondary" className="bg-destructive-light text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {status}
          </Badge>
        );
    }
  };

  const getInsightMessage = (anomaly: Anomaly) => {
    if (anomaly.reason) return anomaly.reason;
    
    if (anomaly.status === "Amount Mismatch") {
      return `Amount difference detected: ${anomaly.bankAmount} vs ${anomaly.shopAmount}`;
    }
    if (anomaly.status === "Missing Transaction") {
      return `Transaction found in bank statement but missing from shop records`;
    }
    return "Requires manual review";
  };

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-success-light/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-success" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No discrepancies found!</h3>
        <p className="text-muted-foreground">All transactions match perfectly between your statements.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Anomaly Insights Panel */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-3 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span>Anomaly Insights</span>
        </h4>
        <div className="grid gap-3">
          {anomalies.map((anomaly, index) => (
            <div 
              key={index}
              className="bg-muted/30 border border-muted/50 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-foreground text-sm">
                      {anomaly.description}
                    </span>
                    {getStatusBadge(anomaly.status, anomaly.severity)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {new Date(anomaly.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="bg-background/50 rounded p-2 text-xs">
                <p className="text-muted-foreground font-medium mb-1">Why this was flagged:</p>
                <p className="text-foreground">{getInsightMessage(anomaly)}</p>
              </div>

              {anomaly.status === "Amount Mismatch" && (
                <div className="flex items-center justify-between text-xs bg-warning-light/20 rounded p-2">
                  <span className="text-muted-foreground">Bank: {anomaly.bankAmount}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-muted-foreground">Shop: {anomaly.shopAmount}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold text-right">Bank Amount</TableHead>
              <TableHead className="font-semibold text-right">Shop Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anomaly, index) => (
              <TableRow key={index} className="hover:bg-muted/30 transition-fast">
                <TableCell className="font-medium text-foreground">
                  {new Date(anomaly.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell className="text-foreground">{anomaly.description}</TableCell>
                <TableCell className="text-right font-mono">
                  <span className={anomaly.status === "Amount Mismatch" ? "text-warning font-semibold" : ""}>
                    {anomaly.bankAmount}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {anomaly.shopAmount === "Not Found" ? (
                    <span className="text-destructive font-semibold">Not Found</span>
                  ) : (
                    <span className={anomaly.status === "Amount Mismatch" ? "text-warning font-semibold" : ""}>
                      {anomaly.shopAmount}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(anomaly.status, anomaly.severity)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {anomalies.length} discrepanc{anomalies.length === 1 ? 'y' : 'ies'}</span>
        <span>Review each transaction carefully</span>
      </div>
    </div>
  );
};
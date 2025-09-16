import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History as HistoryIcon,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Eye,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { getHistory, getAuditById } from "@/api/files";
import { ResultsTable } from "@/components/ResultsTable";
import { AnalyticsWidgets } from "@/components/AnalyticsWidgets";
import { Navbar as RawNavbar } from "@/components/Navbar";


interface UploadRecord {
  id?: string;
  bank_filename?: string;
  shop_filename?: string;
  detected_month?: string;
  status?: string;
  created_at?: string;
}

interface AuditData {
  id?: string;
  upload_id?: string;
  month?: string;
  stats_json?: any;
  matches_json?: any;
  anomalies_json?: any;
  created_at?: string;
}

const History = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const auditCache = useRef<Record<string, AuditData>>({});
  const hasFetchedOnce = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();
const Navbar = useMemo(() => <RawNavbar />, []);


  // Load history only once (even in dev hot reload)
  useEffect(() => {
    if (!hasFetchedOnce.current) {
      loadHistory();
      hasFetchedOnce.current = true;
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getHistory(20);
      setUploads(response.uploads || []);
    } catch (error: any) {
      toast({
        title: "Failed to load history",
        description: error?.response?.data?.error || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadAuditDetails = useCallback(
    async (uploadId: string) => {
      if (auditCache.current[uploadId]) {
        setSelectedAudit(auditCache.current[uploadId]);
        return;
      }

      try {
        setLoadingAudit(true);
        const response = await getAuditById(uploadId);
        auditCache.current[uploadId] = response.audit;
        setSelectedAudit(response.audit);
      } catch (error: any) {
        toast({
          title: "Failed to load audit details",
          description: error?.response?.data?.error || "Please try again",
          variant: "destructive",
        });
      } finally {
        setLoadingAudit(false);
      }
    },
    [toast]
  );

  const handleViewDetails = useCallback(
    (id: string) => () => loadAuditDetails(id),
    [loadAuditDetails]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return (
          <Badge variant="secondary" className="bg-success-light text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="bg-warning-light text-warning border-warning/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Processing
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

  if (selectedAudit) {
    const stats = selectedAudit.stats_json;
    const anomalies = selectedAudit.anomalies_json || [];

    const total = stats?.totalBank || 0;
    const matched = stats?.matched || 0;
    const mismatched = stats?.unmatched || 0;
    const matchAccuracy = stats?.confidencePct ?? Math.round((matched / Math.max(1, total)) * 100);

    const results = {
      totalTransactions: total,
      matched,
      mismatched,
      matchAccuracy,
      lastUploadDate: selectedAudit.created_at,
      uploadId: selectedAudit.upload_id,
      month: selectedAudit.month,
      serverStats: stats,
      anomalies: anomalies.map((a: any) => ({
        date: a.bank?.date || a.shop?.date || "",
        description: a.bank?.description || a.shop?.description || "",
        bankAmount: a.bank ? String(a.bank.amount) : "Not Found",
        shopAmount: a.shop ? String(a.shop.amount) : "Not Found",
        status:
          a.type === "missing_in_bank" || a.type === "missing_in_shop"
            ? "Missing Transaction"
            : "Amount Mismatch",
        severity: "medium" as const,
        reason: undefined,
      })),
    };

    return (
      <div className="min-h-screen bg-gradient-subtle">
        {Navbar}

        <div className="container mx-auto px-2 md:px-6 py-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAudit(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </div>

            <AnalyticsWidgets data={results} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Matched */}
              <Card className="border-success/20 bg-success-light/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-success-foreground/70">Matched</p>
                      <p className="text-2xl font-bold text-success">{results.matched}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              {/* Discrepancies */}
              <Card className="border-warning/20 bg-warning-light/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-warning-foreground/70">Discrepancies</p>
                      <p className="text-2xl font-bold text-warning">{results.mismatched}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-warning" />
                  </div>
                </CardContent>
              </Card>

              {/* Total */}
              <Card className="border-primary/20 bg-primary-light/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-primary-foreground/70">Total</p>
                      <p className="text-2xl font-bold text-primary">{results.totalTransactions}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bank and Shop Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Summary */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Bank Summary</CardTitle>
                  <CardDescription>Opening/closing and totals</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Opening Balance</span><span>{stats?.bankOpeningBalance ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Closing Balance</span><span>{stats?.bankClosingBalance ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Total Debit</span><span>{stats?.bankTotals?.debit ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Total Credit</span><span>{stats?.bankTotals?.credit ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Transactions</span><span>{stats?.bankTxCount ?? "-"}</span></div>
                </CardContent>
              </Card>

              {/* Shop Summary */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Shop Summary</CardTitle>
                  <CardDescription>Opening/closing and totals</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Opening Balance</span><span>{stats?.shopOpeningBalance ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Closing Balance</span><span>{stats?.shopClosingBalance ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Total Debit</span><span>{stats?.shopTotals?.debit ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Total Credit</span><span>{stats?.shopTotals?.credit ?? "-"}</span></div>
                  <div className="flex justify-between"><span>Transactions</span><span>{stats?.shopTxCount ?? "-"}</span></div>
                </CardContent>
              </Card>
            </div>

            {/* Consistency Checks */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Consistency Checks</CardTitle>
                <CardDescription>Numbers must match across both sources</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Transaction Count Equal</span>
                  <span className={stats?.txCountEqual ? "text-success" : "text-destructive"}>
                    {String(stats?.txCountEqual || false)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Totals Equal (Debit/Credit)</span>
                  <span className={stats?.totalsEqual ? "text-success" : "text-destructive"}>
                    {String(stats?.totalsEqual)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Discrepancy Table */}
            <Card className="border-border shadow-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Discrepancy Details</CardTitle>
                  <CardDescription>Review transactions that need attention</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardHeader>
              <CardContent>
                <ResultsTable anomalies={results.anomalies} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {Navbar}
      <div className="container mx-auto px-2 md:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-muted-foreground">Loading history...</span>
          </div>
        ) : uploads.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="bg-muted/20 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No processing history yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Upload your first bank and shop statements to see your analysis history here.
              </p>
              <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="size-4" />
                </Button>
                Recent Analyses ({uploads.length})
              </h2>
              <Button variant="outline" size="sm" onClick={loadHistory}>
                Refresh
              </Button>
            </div>

            <div className="grid gap-4">
              {uploads.map((upload) => (
                <Card key={upload.id} className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {upload.detected_month || "Auto-detected"}
                            </span>
                          </div>
                          {getStatusBadge(upload.status || "")}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Bank Statement</p>
                            <p className="text-sm font-medium text-foreground">{upload.bank_filename}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Shop Statement</p>
                            <p className="text-sm font-medium text-foreground">{upload.shop_filename}</p>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Processed on {formatDate(upload.created_at || "")}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewDetails(upload.id!)}
                          disabled={loadingAudit || upload.status !== "done"}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

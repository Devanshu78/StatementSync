import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Download,
  FileCheck,
  TrendingUp,
  User,
  LogOut
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/api/user";
import { useNavigate } from "react-router-dom";
import { FileUpload } from "@/components/FileUpload";
import { MonthPicker } from "@/components/MonthPicker";
import { ResultsTable } from "@/components/ResultsTable";
import { AnalyticsWidgets } from "@/components/AnalyticsWidgets";
import { uploadStatements } from "@/api/files";

const Dashboard = () => {
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [shopFile, setShopFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    toast({ title: "Signed out", description: "You have been logged out." });
    navigate("/auth");
  };

  const handleStartMatching = async () => {
    if (!bankFile || !shopFile) {
      toast({
        title: "Missing files",
        description: "Please upload both bank and shop statements",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const month = selectedMonth
        ? `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, "0")}`
        : undefined;
      setUploadPercent(0);
      const data = await uploadStatements({
        bank: bankFile,
        shop: shopFile,
        month,
        onUploadProgress: (p) => setUploadPercent(p),
      });
      // Map server stats into widget expectations
      const total = (data.stats as any)?.totalBank || 0;
      const matched = (data.stats as any)?.matched || 0;
      const mismatched = (data.stats as any)?.unmatched || 0;
      const matchAccuracy = (data.stats as any)?.confidencePct ?? Math.round((matched / Math.max(1, total)) * 100);
      setResults({
        totalTransactions: total,
        matched,
        mismatched,
        matchAccuracy,
        lastUploadDate: new Date().toISOString(),
        uploadId: (data as any)?.uploadId,
        month: (data as any)?.month,
        serverStats: data.stats,
        anomalies: (data.anomalies || []).map((a: any) => ({
          date: a.bank?.date || a.shop?.date || "",
          description: a.bank?.description || a.shop?.description || "",
          bankAmount: a.bank ? String(a.bank.amount) : "Not Found",
          shopAmount: a.shop ? String(a.shop.amount) : "Not Found",
          status: a.type === "missing_in_bank" ? "Missing Transaction" : a.type === "missing_in_shop" ? "Missing Transaction" : "Amount Mismatch",
          severity: "medium" as const,
          reason: undefined,
        })),
      });
      setBankFile(null);
      setShopFile(null);
      toast({ title: "Analysis Complete!" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.response?.data?.error || err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <FileCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">StatementSync</h1>
              <p className="text-sm text-muted-foreground">Financial Audit Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">John Doe</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          
          {/* Welcome Section */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">Welcome back!</h2>
            <p className="text-lg text-muted-foreground">
              Upload your statements and let's find any discrepancies together.
            </p>
          </div>

          {/* Upload Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-md hover:shadow-lg transition-fast">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="bg-primary-light p-1 rounded">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <span>Bank Statement</span>
                </CardTitle>
                <CardDescription>
                  Upload your bank statement (CSV, PDF, or Excel)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={setBankFile}
                  selectedFile={bankFile}
                  accept=".csv,.pdf,.xlsx,.xls"
                  id="bank-upload"
                />
              </CardContent>
            </Card>

            <Card className="border-border shadow-md hover:shadow-lg transition-fast">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="bg-success-light p-1 rounded">
                    <FileText className="h-4 w-4 text-success" />
                  </div>
                  <span>Shop Statement</span>
                </CardTitle>
                <CardDescription>
                  Upload your shop/merchant statement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={setShopFile}
                  selectedFile={shopFile}
                  accept=".csv,.pdf,.xlsx,.xls"
                  id="shop-upload"
                />
              </CardContent>
            </Card>
          </div>

          {/* Date Selection & Processing */}
          <Card className="border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Analysis Settings</span>
              </CardTitle>
              <CardDescription>
                Select a specific month or let us auto-detect from your statements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <MonthPicker
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                />
                
                {!selectedMonth && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Auto-detect mode enabled - we'll analyze the full statement period</span>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Uploading {uploadPercent}% ...</span>
                  </div>
                  <Progress value={uploadPercent} className="w-full" />
                </div>
              )}

              <Button 
                variant="primary"
                onClick={handleStartMatching}
                disabled={!bankFile || !shopFile || isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Start Analysis"}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          {results && (
            <div className="space-y-6">
              {/* Analytics Widgets */}
              <AnalyticsWidgets data={results} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Additional server stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Bank Summary</CardTitle>
                    <CardDescription>Opening/closing and totals</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Opening Balance</span><span>{results.serverStats?.bankOpeningBalance ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Closing Balance</span><span>{results.serverStats?.bankClosingBalance ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Total Debit</span><span>{results.serverStats?.bankTotals?.debit ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Total Credit</span><span>{results.serverStats?.bankTotals?.credit ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Transactions</span><span>{results.serverStats?.bankTxCount ?? "-"}</span></div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Shop Summary</CardTitle>
                    <CardDescription>Opening/closing and totals</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Opening Balance</span><span>{results.serverStats?.shopOpeningBalance ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Closing Balance</span><span>{results.serverStats?.shopClosingBalance ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Total Debit</span><span>{results.serverStats?.shopTotals?.debit ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Total Credit</span><span>{results.serverStats?.shopTotals?.credit ?? "-"}</span></div>
                    <div className="flex justify-between"><span>Transactions</span><span>{results.serverStats?.shopTxCount ?? "-"}</span></div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">Consistency Checks</CardTitle>
                  <CardDescription>Numbers must match across both sources</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Transaction Count Equal</span>
                    <span className={results.serverStats?.txCountEqual ? "text-success" : "text-destructive"}>
                      {String(results.serverStats?.txCountEqual || false)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Totals Equal (Debit/Credit)</span>
                    <span className={results.serverStats?.totalsEqual ? "text-success" : "text-destructive"}>
                      {String(results.serverStats?.totalsEqual)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Discrepancy Details</CardTitle>
                    <CardDescription>
                      Review transactions that need attention
                    </CardDescription>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
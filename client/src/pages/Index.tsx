import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Shield,
  Zap,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Users,
  Building,
  Calculator,
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast Processing",
      description:
        "Analyze thousands of transactions in seconds with our advanced algorithms",
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description:
        "Your financial data is encrypted and protected with enterprise-level security",
    },
    {
      icon: CheckCircle,
      title: "Smart Detection",
      description:
        "AI-powered anomaly detection finds discrepancies you might miss",
    },
    {
      icon: TrendingUp,
      title: "Detailed Reports",
      description:
        "Export comprehensive audit reports for accounting and compliance",
    },
  ];

  const useCases = [
    {
      icon: Building,
      title: "Small Businesses",
      description: "Streamline your monthly reconciliation process",
    },
    {
      icon: Users,
      title: "Freelancers",
      description: "Keep track of client payments and expenses",
    },
    {
      icon: Calculator,
      title: "Accountants",
      description: "Audit multiple clients efficiently",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-primary p-2 rounded-lg">
              <FileCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              StatementSync
            </h1>
          </div>

          <Button variant="primary" onClick={() => navigate("/auth")} className="hidden md:block">
            Get Started
            <ArrowRight className="ml-1 md:ml-2 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center space-y-8 max-w-4xl">
          <div className="space-y-4">
            <Badge
              variant="secondary"
              className="bg-primary-light text-primary border-primary/20"
            >
              ✨ Modern Financial Auditing
            </Badge>
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              Sync Your Financial
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {" "}
                Statements
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your bank and shop statements, and let our AI-powered
              system find discrepancies, missing transactions, and anomalies in
              seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6"
            >
              Start Your Audit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">99.8%</div>
              <div className="text-muted-foreground">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">&lt; 30s</div>
              <div className="text-muted-foreground">Processing Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10,000+</div>
              <div className="text-muted-foreground">Transactions/Min</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-3xl font-bold text-foreground">
              Why Choose StatementSync?
            </h3>
            <p className="text-lg text-muted-foreground">
              Built for modern businesses that value accuracy and efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-border shadow-md hover:shadow-lg transition-fast"
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="bg-primary-light p-3 rounded-lg w-fit mx-auto">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-3xl font-bold text-foreground">Perfect For</h3>
            <p className="text-lg text-muted-foreground">
              Whether you're a business owner, freelancer, or accountant
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card
                key={index}
                className="border-border shadow-md hover:shadow-lg transition-fast text-center"
              >
                <CardContent className="p-8 space-y-4">
                  <div className="bg-gradient-subtle p-4 rounded-full w-fit mx-auto">
                    <useCase.icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      {useCase.title}
                    </h4>
                    <p className="text-muted-foreground">
                      {useCase.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-primary">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-primary-foreground">
              Ready to Streamline Your Financial Auditing?
            </h3>
            <p className="text-lg text-primary-foreground/90">
              Join thousands of businesses already using StatementSync to save
              time and ensure accuracy.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 bg-card text-primary hover:bg-card/90"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-primary p-1 rounded">
                <FileCheck className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">
                StatementSync
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 StatementSync. Built for modern financial auditing.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

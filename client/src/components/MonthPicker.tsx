import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MonthPickerProps {
  selectedMonth: Date | null;
  onMonthChange: (date: Date | null) => void;
}

export const MonthPicker = ({ selectedMonth, onMonthChange }: MonthPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10; // allow navigating up to 10 years back
  const [displayYear, setDisplayYear] = useState<number>(currentYear);

  const handleMonthSelect = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    onMonthChange(date);
    setIsOpen(false);
  };

  const handleClear = () => {
    onMonthChange(null);
    setIsOpen(false);
  };

  const formatSelectedMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Target Month (Optional)
      </label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedMonth && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {selectedMonth ? formatSelectedMonth(selectedMonth) : "Auto-detect from statements"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDisplayYear((y) => Math.max(minYear, y - 1))}
                >
                  ◀
                </Button>
                <h4 className="font-medium text-foreground">{displayYear}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={displayYear >= currentYear}
                  onClick={() => setDisplayYear((y) => Math.min(currentYear, y + 1))}
                >
                  ▶
                </Button>
              </div>
              {selectedMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => {
                const isSelected = selectedMonth &&
                  selectedMonth.getFullYear() === displayYear &&
                  selectedMonth.getMonth() === index;

                // Disallow future months in the current year
                const isFutureMonth = displayYear === currentYear && index > new Date().getMonth();

                return (
                  <Button
                    key={month}
                    variant={isSelected ? "primary" : "ghost"}
                    size="sm"
                    disabled={isFutureMonth}
                    onClick={() => handleMonthSelect(index, displayYear)}
                    className="text-xs justify-center"
                  >
                    {month.substring(0, 3)}
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Leave blank to analyze the full statement period automatically
      </p>
    </div>
  );
};
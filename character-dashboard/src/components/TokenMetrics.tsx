import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Coins, DollarSign, BarChart3, Zap } from 'lucide-react';

interface TokenMetricsProps {
  tokenData: {
    address: string;
    name: string;
    symbol: string;
    tokenHolders?: number;
    volume24h?: number;
    circulatingSupply?: number;
    totalSupply?: number;
    marketCap?: number;
    currentPrice?: number;
  };
  className?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatTokenAmount = (amount: number): string => {
  return formatNumber(amount);
};

export const TokenMetrics: React.FC<TokenMetricsProps> = ({ tokenData, className = '' }) => {
  const metrics = [
    {
      label: 'Token Holders',
      value: tokenData.tokenHolders || 800,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      format: formatNumber,
    },
    {
      label: '24h Volume',
      value: tokenData.volume24h || 8000,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      format: formatCurrency,
    },
    {
      label: 'Circulating Supply',
      value: tokenData.circulatingSupply || 1200000,
      icon: Coins,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      format: formatTokenAmount,
    },
    {
      label: 'Total Supply',
      value: tokenData.totalSupply || 10000000,
      icon: BarChart3,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      format: formatTokenAmount,
    },
    {
      label: 'Market Cap',
      value: tokenData.marketCap || 300000,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      format: formatCurrency,
    },
    {
      label: 'Current Price',
      value: tokenData.currentPrice || 0.25,
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      format: formatCurrency,
    },
  ];

  return (
    <Card className={`backdrop-blur-sm bg-background/50 border border-white/10 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          Token Metrics
          {tokenData.symbol && (
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              ${tokenData.symbol}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border border-white/5 ${metric.bgColor} hover:bg-opacity-20 transition-all duration-200`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {metric.label}
                  </span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {metric.format(metric.value)}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Token Address */}
        {tokenData.address && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Token Address:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {`${tokenData.address.slice(0, 6)}...${tokenData.address.slice(-4)}`}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

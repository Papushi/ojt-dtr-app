import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { Clock, Target, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DTREntry, AppConfig } from '../types';
import { formatDuration } from '../utils/helpers';

interface DashboardProps {
  entries: DTREntry[];
  config: AppConfig;
}

export const Dashboard: React.FC<DashboardProps> = ({ entries, config }) => {
  const totalCompleted = entries.reduce((acc, curr) => acc + curr.totalHours, 0);
  const remaining = Math.max(0, config.targetHours - totalCompleted);
  const percentage = Math.min(100, (totalCompleted / config.targetHours) * 100);
  
  const data = [
    { name: 'Completed', value: totalCompleted },
    { name: 'Remaining', value: remaining },
  ];

  const COLORS = ['#3b82f6', '#e2e8f0'];

  const avgDaily = entries.length > 0 ? totalCompleted / entries.length : 0;
  const daysRemaining = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : Infinity;
  
  const projectedFinish = daysRemaining !== Infinity 
    ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString()
    : 'N/A';

  const isOnTrack = avgDaily >= (config.targetHours / 30); // Arbitrary "on track" logic: finish in 30 days

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Progress Circle Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="text-blue-500" size={20} />
          OJT Progress
        </h3>
        <div className="w-full h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <Label
                  value={`${percentage.toFixed(1)}%`}
                  position="center"
                  className="text-3xl font-bold fill-slate-900 dark:fill-white"
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {totalCompleted.toFixed(1)} / {config.targetHours} hrs
          </p>
          <p className="text-sm text-slate-500">{remaining.toFixed(1)} hours remaining</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
          icon={<TrendingUp className="text-emerald-500" />}
          label="Daily Average"
          value={`${avgDaily.toFixed(2)} hrs/day`}
          subtext="Based on all entries"
        />
        <StatCard 
          icon={<Calendar className="text-indigo-500" />}
          label="Projected Finish"
          value={projectedFinish}
          subtext={`In approx. ${daysRemaining === Infinity ? '?' : daysRemaining} days`}
        />
        <StatCard 
          icon={isOnTrack ? <CheckCircle2 className="text-blue-500" /> : <AlertCircle className="text-amber-500" />}
          label="Status"
          value={isOnTrack ? "On Track" : "Behind Schedule"}
          subtext={isOnTrack ? "Keep up the good work!" : "Try to increase daily hours"}
          className={isOnTrack ? "border-blue-100 bg-blue-50/30" : "border-amber-100 bg-amber-50/30"}
        />
        <StatCard 
          icon={<Clock className="text-purple-500" />}
          label="Total Entries"
          value={`${entries.length} Days`}
          subtext={`${entries.filter(e => e.isOvertime).length} Overtime sessions`}
        />
      </div>

      {percentage >= 100 && (
        <div className="lg:col-span-3 bg-emerald-50 border border-emerald-200 p-6 rounded-2xl flex items-center gap-4 animate-bounce">
          <div className="bg-emerald-500 p-3 rounded-full text-white">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h4 className="text-xl font-bold text-emerald-900">Congratulations!</h4>
            <p className="text-emerald-700">You have completed your required OJT hours. Time to celebrate!</p>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subtext: string, className?: string }> = ({ icon, label, value, subtext, className }) => (
  <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 ${className}`}>
    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{subtext}</p>
    </div>
  </div>
);

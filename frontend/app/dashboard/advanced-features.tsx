/**
 * Advanced Features Dashboard for BioThings 2025
 * Showcases Gemini 2.5 capabilities
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Dna, 
  FlaskConical, 
  Brain, 
  Microscope,
  Activity,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export function AdvancedFeaturesDashboard() {
  const [thinkingBudget, setThinkingBudget] = useState(8192);
  const [activeExperiment, setActiveExperiment] = useState(null);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">BioThings Advanced Features</h1>
          <p className="text-muted-foreground">Powered by Gemini 2.5 with Thinking Mode</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Thinking Budget:</span>
            <span className="ml-2 font-mono">{thinkingBudget.toLocaleString()} tokens</span>
          </div>
          <Button variant="outline" size="sm">
            <Brain className="w-4 h-4 mr-2" />
            Optimize
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="crispr" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="crispr">
            <Dna className="w-4 h-4 mr-2" />
            CRISPR Designer
          </TabsTrigger>
          <TabsTrigger value="drug">
            <FlaskConical className="w-4 h-4 mr-2" />
            Drug Discovery
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Microscope className="w-4 h-4 mr-2" />
            Multimodal Analysis
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="w-4 h-4 mr-2" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* CRISPR Designer Tab */}
        <TabsContent value="crispr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered CRISPR Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Gene</label>
                  <input 
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    placeholder="e.g., TP53, BRCA1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Cas Type</label>
                  <select className="w-full mt-1 px-3 py-2 border rounded-md">
                    <option>SpCas9</option>
                    <option>SaCas9</option>
                    <option>Cas12a</option>
                    <option>Base Editor</option>
                    <option>Prime Editor</option>
                  </select>
                </div>
              </div>

              <Button className="w-full">
                <Brain className="w-4 h-4 mr-2" />
                Design Guides with AI Thinking
              </Button>

              {/* Results Preview */}
              <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
                <h4 className="font-medium mb-2">Predicted Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>On-target efficiency:</span>
                    <span className="font-mono">92.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Off-target risk:</span>
                    <span className="font-mono text-green-600">Low (0.02)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Design confidence:</span>
                    <Progress value={95} className="w-24" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Experiment Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle>Active CRISPR Experiments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['TP53 Knockout - HeLa', 'CFTR Correction - iPSC', 'CAR-T Enhancement'].map((exp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">{exp}</p>
                        <p className="text-sm text-muted-foreground">Day {3 + i * 2} of 21</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">View Details</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drug Discovery Tab */}
        <TabsContent value="drug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Drug Screening Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">127,439</h3>
                  <p className="text-sm text-muted-foreground">Compounds Screened</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">342</h3>
                  <p className="text-sm text-muted-foreground">Potential Hits</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">12</h3>
                  <p className="text-sm text-muted-foreground">Lead Candidates</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Top Lead Compounds</h4>
                {['BTX-2847', 'BTX-3195', 'BTX-4021'].map((compound, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono font-medium">{compound}</p>
                        <p className="text-sm text-muted-foreground">
                          IC50: {(0.05 + i * 0.03).toFixed(2)}μM | Selectivity: {95 - i * 5}x
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          AI Score: {(0.94 - i * 0.05).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Thinking: 12,384 tokens
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multimodal Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multimodal Experiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <Microscope className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">Drop microscopy images here</p>
                  </div>
                  <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">Upload sequencing data</p>
                  </div>
                </div>

                <div className="p-4 bg-secondary/20 rounded-lg">
                  <h4 className="font-medium mb-2">AI Analysis Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    Gemini 2.5 will analyze multiple data types simultaneously:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Cell morphology changes</li>
                    <li>• Gene expression patterns</li>
                    <li>• Protein localization</li>
                    <li>• Phenotypic correlations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Research Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Novel Discovery</h4>
                      <p className="text-sm mt-1">
                        Analysis of your CRISPR screens suggests a previously unknown 
                        interaction between TP53 and the metabolic pathway regulated by AMPK. 
                        This could explain the unexpected cell survival in 15% of knockouts.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: 87% | Based on 1,247 papers | Thinking: 18,923 tokens
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Literature Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Papers analyzed:</span>
                        <span className="font-mono">42,381</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New connections found:</span>
                        <span className="font-mono">127</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Patent conflicts:</span>
                        <span className="font-mono text-green-600">0</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Predictive Modeling</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Success probability:</span>
                        <span className="font-mono">84.2%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time to milestone:</span>
                        <span className="font-mono">6.3 months</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cost optimization:</span>
                        <span className="font-mono text-green-600">-32%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cost Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Gemini 2.5 Usage & Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tokens Used (24h)</p>
              <p className="text-2xl font-bold">2.4M</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Thinking Tokens</p>
              <p className="text-2xl font-bold">847K</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cost Today</p>
              <p className="text-2xl font-bold">$1.82</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className="text-2xl font-bold text-green-600">127x</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
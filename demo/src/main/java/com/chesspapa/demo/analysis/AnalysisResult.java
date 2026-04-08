package com.chesspapa.demo.analysis;

public class AnalysisResult {
    private Double evaluation;
    private Integer depthUsed;
    private String bestMove;

    public AnalysisResult() {
        this.evaluation = 0.0;
        this.depthUsed = 0;
        this.bestMove = null;
    }

    public Double getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(Double evaluation) {
        this.evaluation = evaluation;
    }

    public Integer getDepthUsed() {
        return depthUsed;
    }

    public void setDepthUsed(Integer depthUsed) {
        this.depthUsed = depthUsed;
    }

    public String getBestMove() {
        return bestMove;
    }

    public void setBestMove(String bestMove) {
        this.bestMove = bestMove;
    }
}

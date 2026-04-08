package com.chesspapa.demo.analysis;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AnalyzePositionResponse {

    private String fen;
    private Double evaluation;

    @JsonProperty("depth_used")
    private Integer depthUsed;

    @JsonProperty("best_move")
    private String bestMove;

    private String insight;

    public AnalyzePositionResponse() {
    }

    public AnalyzePositionResponse(String fen, Double evaluation, Integer depthUsed, String bestMove, String insight) {
        this.fen = fen;
        this.evaluation = evaluation;
        this.depthUsed = depthUsed;
        this.bestMove = bestMove;
        this.insight = insight;
    }

    public String getFen() {
        return fen;
    }

    public void setFen(String fen) {
        this.fen = fen;
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

    public String getInsight() {
        return insight;
    }

    public void setInsight(String insight) {
        this.insight = insight;
    }
}

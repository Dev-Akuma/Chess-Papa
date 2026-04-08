package com.chesspapa.demo.analysis;

public class MoveAnalysis {
    private Integer moveNumber;
    private String uci;
    private String san;
    private Double evaluation;
    private String insight;

    public MoveAnalysis() {
    }

    public MoveAnalysis(Integer moveNumber, String uci, String san, Double evaluation, String insight) {
        this.moveNumber = moveNumber;
        this.uci = uci;
        this.san = san;
        this.evaluation = evaluation;
        this.insight = insight;
    }

    public Integer getMoveNumber() {
        return moveNumber;
    }

    public void setMoveNumber(Integer moveNumber) {
        this.moveNumber = moveNumber;
    }

    public String getUci() {
        return uci;
    }

    public void setUci(String uci) {
        this.uci = uci;
    }

    public String getSan() {
        return san;
    }

    public void setSan(String san) {
        this.san = san;
    }

    public Double getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(Double evaluation) {
        this.evaluation = evaluation;
    }

    public String getInsight() {
        return insight;
    }

    public void setInsight(String insight) {
        this.insight = insight;
    }
}

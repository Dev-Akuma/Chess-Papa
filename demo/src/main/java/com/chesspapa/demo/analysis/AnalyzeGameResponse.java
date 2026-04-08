package com.chesspapa.demo.analysis;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AnalyzeGameResponse {

    @JsonProperty("player_white")
    private String playerWhite;

    @JsonProperty("player_black")
    private String playerBlack;

    private String result;

    @JsonProperty("total_moves")
    private Integer totalMoves;

    private List<MoveAnalysis> analysis;

    public AnalyzeGameResponse() {
    }

    public AnalyzeGameResponse(String playerWhite, String playerBlack, String result, Integer totalMoves, List<MoveAnalysis> analysis) {
        this.playerWhite = playerWhite;
        this.playerBlack = playerBlack;
        this.result = result;
        this.totalMoves = totalMoves;
        this.analysis = analysis;
    }

    public String getPlayerWhite() {
        return playerWhite;
    }

    public void setPlayerWhite(String playerWhite) {
        this.playerWhite = playerWhite;
    }

    public String getPlayerBlack() {
        return playerBlack;
    }

    public void setPlayerBlack(String playerBlack) {
        this.playerBlack = playerBlack;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public Integer getTotalMoves() {
        return totalMoves;
    }

    public void setTotalMoves(Integer totalMoves) {
        this.totalMoves = totalMoves;
    }

    public List<MoveAnalysis> getAnalysis() {
        return analysis;
    }

    public void setAnalysis(List<MoveAnalysis> analysis) {
        this.analysis = analysis;
    }
}

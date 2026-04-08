package com.chesspapa.demo.analysis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class AnalyzePositionRequest {

    @NotBlank(message = "FEN is required")
    private String fen;

    @Min(value = 5, message = "Depth must be at least 5")
    @Max(value = 24, message = "Depth cannot exceed 24")
    private Integer depth;

    private Double previousEval;

    public String getFen() {
        return fen;
    }

    public void setFen(String fen) {
        this.fen = fen;
    }

    public Integer getDepth() {
        return depth;
    }

    public void setDepth(Integer depth) {
        this.depth = depth;
    }

    public Double getPreviousEval() {
        return previousEval;
    }

    public void setPreviousEval(Double previousEval) {
        this.previousEval = previousEval;
    }
}

package com.chesspapa.demo.analysis;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class AnalyzeGameRequest {

    @NotBlank(message = "PGN is required")
    private String pgn;

    @Min(value = 5, message = "Depth must be at least 5")
    @Max(value = 20, message = "Depth cannot exceed 20")
    private Integer depth;

    public String getPgn() {
        return pgn;
    }

    public void setPgn(String pgn) {
        this.pgn = pgn;
    }

    public Integer getDepth() {
        return depth;
    }

    public void setDepth(Integer depth) {
        this.depth = depth;
    }
}

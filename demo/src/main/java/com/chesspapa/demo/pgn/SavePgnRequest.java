package com.chesspapa.demo.pgn;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class SavePgnRequest {

    @NotBlank(message = "PGN is required")
    private String pgn;

    @Min(value = 5, message = "Depth must be at least 5")
    @Max(value = 24, message = "Depth cannot exceed 24")
    private Integer depth;

    @Min(value = 0, message = "Move count cannot be negative")
    private Integer moveCount;

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

    public Integer getMoveCount() {
        return moveCount;
    }

    public void setMoveCount(Integer moveCount) {
        this.moveCount = moveCount;
    }
}

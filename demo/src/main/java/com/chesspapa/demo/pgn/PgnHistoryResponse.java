package com.chesspapa.demo.pgn;

import java.time.LocalDateTime;

public class PgnHistoryResponse {

    private final Long id;
    private final String pgn;
    private final Integer depth;
    private final Integer moveCount;
    private final LocalDateTime createdAt;

    public PgnHistoryResponse(Long id, String pgn, Integer depth, Integer moveCount, LocalDateTime createdAt) {
        this.id = id;
        this.pgn = pgn;
        this.depth = depth;
        this.moveCount = moveCount;
        this.createdAt = createdAt;
    }

    public static PgnHistoryResponse fromEntity(PgnHistory entity) {
        return new PgnHistoryResponse(
            entity.getId(),
            entity.getPgn(),
            entity.getDepth(),
            entity.getMoveCount(),
            entity.getCreatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public String getPgn() {
        return pgn;
    }

    public Integer getDepth() {
        return depth;
    }

    public Integer getMoveCount() {
        return moveCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

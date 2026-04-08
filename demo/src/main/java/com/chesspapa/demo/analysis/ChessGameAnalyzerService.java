package com.chesspapa.demo.analysis;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ChessGameAnalyzerService {

    private final StockfishEngineService engineService;

    public ChessGameAnalyzerService(StockfishEngineService engineService) {
        this.engineService = engineService;
    }

    public AnalyzeGameResponse analyzeGame(String pgnString, Integer depth) throws IOException {
        if (depth == null) {
            depth = 10;
        }

        // React frontend parses PGN and sends move-by-move FENs
        // For now, return a placeholder response
        // The actual analysis happens via the /api/analyze/position endpoint
        
        return new AnalyzeGameResponse(
            "User",
            "Opponent",
            "Completed",
            0,
            new ArrayList<>()
        );
    }

    public AnalyzePositionResponse analyzePosition(String fen, Integer depth, Double previousEval) throws IOException {
        if (depth == null) {
            depth = 10;
        }

        AnalysisResult result = engineService.analyzePosition(fen, depth);

        String insight;
        if (previousEval == null) {
            insight = "Fresh position scan complete.";
        } else {
            Double evalDiff = result.getEvaluation() - previousEval;
            insight = generateInsight(evalDiff);
        }

        return new AnalyzePositionResponse(
            fen,
            result.getEvaluation(),
            result.getDepthUsed(),
            result.getBestMove(),
            insight
        );
    }

    private String generateInsight(Double evalDiff) {
        if (Math.abs(evalDiff) > 1.5) {
            return "Blunder detected: major evaluation swing.";
        } else if (Math.abs(evalDiff) > 0.8) {
            return "Inaccuracy: notable drop in position quality.";
        } else if (Math.abs(evalDiff) > 0.3) {
            return "Playable move, but there was likely a stronger option.";
        } else {
            return "Solid move.";
        }
    }
}

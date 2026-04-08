package com.chesspapa.demo.analysis;

import java.io.IOException;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/analyze")
public class AnalysisController {

    private static final Logger logger = LoggerFactory.getLogger(AnalysisController.class);

    private final ChessGameAnalyzerService analyzerService;

    public AnalysisController(ChessGameAnalyzerService analyzerService) {
        this.analyzerService = analyzerService;
    }

    @PostMapping("/full-game")
    public ResponseEntity<?> analyzeFullGame(@Valid @RequestBody AnalyzeGameRequest request) {
        try {
            AnalyzeGameResponse response = analyzerService.analyzeGame(request.getPgn(), request.getDepth());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid PGN: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("detail", "Invalid PGN: " + e.getMessage()));
        } catch (IOException e) {
            logger.error("Analysis failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("detail", "Analysis failed: " + e.getMessage()));
        }
    }

    @PostMapping("/position")
    public ResponseEntity<?> analyzePosition(@Valid @RequestBody AnalyzePositionRequest request) {
        try {
            AnalyzePositionResponse response = analyzerService.analyzePosition(
                request.getFen(),
                request.getDepth(),
                request.getPreviousEval()
            );
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            logger.error("Position analysis failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("detail", "Engine error: " + e.getMessage()));
        }
    }
}

package com.financeai.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @PostMapping("/predict")
    public Map<String, String> predictCategory(@RequestBody Map<String, String> request) {

        String description = request.get("description");

        // Flask API URL
        String url = "http://127.0.0.1:5000/predict";

        // Body for Flask
        Map<String, String> flaskBody = new HashMap<>();
        flaskBody.put("description", description);

        // Send request to Flask
        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<Map> response =
                restTemplate.postForEntity(url, flaskBody, Map.class);

        Map<String, Object> flaskResponse = response.getBody();

        String category = flaskResponse.get("category").toString();

        // Final response to frontend
        Map<String, String> finalResponse = new HashMap<>();
        finalResponse.put("description", description);
        finalResponse.put("category", category);

        return finalResponse;
    }
}

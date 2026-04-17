package com.example.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    @RequestMapping(value = {"/login", "/register", "/dashboard", "/send-email",
            "/candidate-register", "/candidate-photo/{id}", "/candidate-video/{id}",
            "/identity-verification/{id}", "/candidate-assessment/{id}", "/assessment-report/{id}",
            "/candidates", "/candidate-profile/{id}"})
    public String forward() {
        return "forward:/index.html";
    }
}

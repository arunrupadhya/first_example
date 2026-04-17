package com.example.backend;

import com.example.backend.config.AwsSecretsBootstrap;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class BackendApplication {

	public static void main(String[] args) {
		AwsSecretsBootstrap.initialize();
		SpringApplication.run(BackendApplication.class, args);
	}

}

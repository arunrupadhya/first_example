package com.example.backend.config;

import com.example.backend.model.TechStack;
import com.example.backend.repository.TechStackRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TechStackDataInitializer implements CommandLineRunner {

    private final TechStackRepository techStackRepository;

    public TechStackDataInitializer(TechStackRepository techStackRepository) {
        this.techStackRepository = techStackRepository;
    }

    @Override
    public void run(String... args) {
        if (techStackRepository.count() > 0) {
            return; // Data already seeded
        }

        List<TechStack> stacks = List.of(
            ts("Java", "Languages"), ts("Python", "Languages"), ts("JavaScript", "Languages"),
            ts("TypeScript", "Languages"), ts("C#", "Languages"), ts("C++", "Languages"),
            ts("Go", "Languages"), ts("Rust", "Languages"), ts("Ruby", "Languages"),
            ts("PHP", "Languages"), ts("Swift", "Languages"), ts("Kotlin", "Languages"),
            ts("Scala", "Languages"), ts("R", "Languages"),

            ts("React", "Frontend"), ts("Angular", "Frontend"), ts("Vue.js", "Frontend"),
            ts("Next.js", "Frontend"), ts("Svelte", "Frontend"), ts("HTML/CSS", "Frontend"),
            ts("Tailwind CSS", "Frontend"), ts("Bootstrap", "Frontend"),

            ts("Spring Boot", "Backend"), ts("Node.js", "Backend"), ts("Express.js", "Backend"),
            ts("Django", "Backend"), ts("Flask", "Backend"), ts("FastAPI", "Backend"),
            ts(".NET Core", "Backend"), ts("Ruby on Rails", "Backend"), ts("NestJS", "Backend"),

            ts("PostgreSQL", "Databases"), ts("MySQL", "Databases"), ts("MongoDB", "Databases"),
            ts("Redis", "Databases"), ts("Oracle", "Databases"), ts("SQL Server", "Databases"),
            ts("DynamoDB", "Databases"), ts("Cassandra", "Databases"), ts("Elasticsearch", "Databases"),

            ts("AWS", "Cloud & DevOps"), ts("Azure", "Cloud & DevOps"), ts("GCP", "Cloud & DevOps"),
            ts("Docker", "Cloud & DevOps"), ts("Kubernetes", "Cloud & DevOps"),
            ts("Terraform", "Cloud & DevOps"), ts("Jenkins", "Cloud & DevOps"),
            ts("GitHub Actions", "Cloud & DevOps"), ts("CI/CD", "Cloud & DevOps"),
            ts("Ansible", "Cloud & DevOps"),

            ts("Apache Spark", "Data & AI/ML"), ts("TensorFlow", "Data & AI/ML"),
            ts("PyTorch", "Data & AI/ML"), ts("Pandas", "Data & AI/ML"),
            ts("Apache Kafka", "Data & AI/ML"), ts("Hadoop", "Data & AI/ML"),

            ts("React Native", "Mobile"), ts("Flutter", "Mobile"),
            ts("Android (Java/Kotlin)", "Mobile"), ts("iOS (Swift)", "Mobile"),

            ts("Git", "Tools"), ts("REST APIs", "Tools"), ts("GraphQL", "Tools"),
            ts("Microservices", "Tools"), ts("RabbitMQ", "Tools"), ts("gRPC", "Tools"),
            ts("Linux", "Tools"), ts("Agile/Scrum", "Tools")
        );

        if (stacks != null && !stacks.isEmpty()) {
            techStackRepository.saveAll(stacks);
        } else {
            System.out.println("No tech stacks to seed.");
            throw new RuntimeException("Tech stack list is empty. Seeding failed.");
        }
    }

    private TechStack ts(String name, String category) {
        TechStack t = new TechStack();
        t.setName(name);
        t.setCategory(category);
        return t;
    }
}

package com.example.backend.repository;

import com.example.backend.model.TechStack;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TechStackRepository extends JpaRepository<TechStack, Long> {

    List<TechStack> findAllByOrderByCategoryAscNameAsc();
}

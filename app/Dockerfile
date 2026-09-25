FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw -B package -DskipTests --no-transfer-progress || \
    (apk add --no-cache maven && mvn -B package -DskipTests --no-transfer-progress)

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
USER nobody
ENTRYPOINT ["java", "-jar", "app.jar"]

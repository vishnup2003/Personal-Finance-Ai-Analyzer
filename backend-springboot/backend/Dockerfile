FROM openjdk:21-jdk-slim

WORKDIR /app

COPY . .

RUN ./mvnw clean package -DskipTests

EXPOSE 8081

CMD ["java", "-jar", "target/backend-0.0.1-SNAPSHOT.jar"]

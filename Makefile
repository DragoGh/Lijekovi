CC = gcc
CFLAGS = -Wall -Wextra -std=c11 -g
TARGET = lijekovi_app
OBJS = main.o lijekovi.o

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean

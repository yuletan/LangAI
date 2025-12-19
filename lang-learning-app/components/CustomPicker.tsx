import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Radius, Spacing } from "@/constants/theme";

interface PickerOption {
  label: string;
  value: string;
  displayLabel?: string; // Short label shown in the button
}

interface CustomPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  theme: "light" | "dark";
  placeholder?: string;
}

export default function CustomPicker({
  selectedValue,
  onValueChange,
  options,
  theme,
  placeholder = "Select...",
}: CustomPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const isDark = theme === "dark";
  const bgColor = isDark ? "#1e293b" : "#fff";
  const textColor = isDark ? "#fff" : "#1f2937";
  const borderColor = isDark ? "#334155" : "#e5e7eb";
  const modalBg = isDark ? "#0f172a" : "#fff";
  const itemHoverBg = isDark ? "#334155" : "#f3f4f6";

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayLabel = selectedOption?.displayLabel || selectedOption?.label || placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: bgColor, borderColor }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, { color: textColor }]} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={textColor} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor:
                        item.value === selectedValue ? itemHoverBg : "transparent",
                    },
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: textColor }]}>
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Ionicons name="checkmark" size={20} color="#6366f1" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxHeight: 350,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionText: {
    fontSize: 16,
  },
});

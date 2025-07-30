import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface TabsProps {
  children:
    | React.ReactElement<TabPanelProps>
    | React.ReactElement<TabPanelProps>[];
  initialTab?: string;
}

interface TabPanelProps {
  label: string;
  children: React.ReactNode;
}

// TabPanel component (inner component, not exported directly)
const TabPanel: React.FC<TabPanelProps> = ({ children }) => {
  return <View style={styles.tabContent}>{children}</View>;
};

// Main Tabs component
export default function Tabs({ children, initialTab }: TabsProps) {
  // Filter out null or false children and explicitly cast the type
  const panels = React.Children.toArray(children).filter(
    Boolean
  ) as React.ReactElement<TabPanelProps>[];
  const [activeTab, setActiveTab] = useState(
    initialTab || (panels.length > 0 ? panels[0].props.label : "")
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabHeaders}>
        {panels.map((panel) => (
          <TouchableOpacity
            key={panel.props.label}
            style={[
              styles.tabHeader,
              activeTab === panel.props.label && styles.activeTabHeader,
            ]}
            onPress={() => setActiveTab(panel.props.label)}
          >
            <Text
              style={[
                styles.tabHeaderText,
                activeTab === panel.props.label && styles.activeTabHeaderText,
              ]}
            >
              {panel.props.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {panels.map((panel) =>
        activeTab === panel.props.label ? panel.props.children : null
      )}
    </View>
  );
}

// Attach TabPanel to Tabs for easy usage
Tabs.Panel = TabPanel;

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  tabHeaders: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginBottom: 10,
  },
  tabHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: "#f9f9f9",
  },
  activeTabHeader: {
    borderBottomWidth: 2,
    borderBottomColor: "#007bff", // Active tab indicator color
    backgroundColor: "#fff",
  },
  tabHeaderText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "normal",
  },
  activeTabHeaderText: {
    color: "#007bff",
    fontWeight: "bold",
  },
  tabContent: {
    paddingTop: 5,
  },
});

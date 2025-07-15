import { View, Text, StyleSheet } from "react-native";

interface UserStats {
    claims_made: number;
    comments_made: number;
    up_votes_received: number;
    down_votes_received: number;
}

interface StatisticsProps {
    userStats: UserStats;
}

export default function Statistics({ userStats }: StatisticsProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>📊 Your Activity Statistics</Text>
            
            {/* Activity Section */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Your Activity</Text>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Claims Made</Text>
                    <Text style={styles.statValue}>{userStats.claims_made}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Comments Made</Text>
                    <Text style={styles.statValue}>{userStats.comments_made}</Text>
                </View>
            </View>

            {/* Votes Received Section */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Votes Received</Text>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>👍 Up Votes</Text>
                    <Text style={styles.statValue}>{userStats.up_votes_received}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>👎 Down Votes</Text>
                    <Text style={styles.statValue}>{userStats.down_votes_received}</Text>
                </View>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>📈 Total Votes</Text>
                    <Text style={[styles.statValue, styles.totalVotes]}>
                        {userStats.up_votes_received + userStats.down_votes_received}
                    </Text>
                </View>
            </View>

            {/* Engagement Score */}
            <View style={styles.section}>
                <Text style={styles.sectionHeader}>Engagement Score</Text>
                <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total Engagement</Text>
                    <Text style={styles.statValue}>
                        {userStats.claims_made + userStats.comments_made + userStats.up_votes_received + userStats.down_votes_received}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#1a1a1a',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#007AFF',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    statLabel: {
        fontSize: 16,
        color: '#666',
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'right',
    },
    totalVotes: {
        color: '#007AFF',
    },
});